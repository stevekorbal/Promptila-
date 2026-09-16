import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient, isSupabaseConfigured, fetchUserProfile } from '../lib/supabase.ts';
import { UserProfile, UserRole } from '../types.ts';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole | null;
  session: Session | null;
  isLoading: boolean;
  isConfigured: boolean;
  signUp: (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => Promise<{ error: Error | null; data?: any }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data?: any; role?: UserRole }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load user profile from Supabase profiles table
  const loadProfile = async (userId: string, userEmail?: string): Promise<UserProfile | null> => {
    try {
      const userProfile = await fetchUserProfile(userId);
      if (userProfile) {
        setProfile(userProfile);
        setRole(userProfile.role);
        return userProfile;
      } else {
        const fallbackProfile: UserProfile = {
          id: userId,
          email: userEmail,
          role: 'user',
        };
        setProfile(fallbackProfile);
        setRole('user');
        return fallbackProfile;
      }
    } catch (err) {
      console.warn('Failed to load profile from profiles table:', err);
      const fallbackProfile: UserProfile = {
        id: userId,
        email: userEmail,
        role: 'user',
      };
      setProfile(fallbackProfile);
      setRole('user');
      return fallbackProfile;
    }
  };

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      setIsLoading(false);
      return;
    }

    // 1. Check active session from Supabase Auth
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email).finally(() => {
          setIsLoading(false);
        });
      } else {
        setIsLoading(false);
      }
    });

    // 2. Listen for auth state changes from Supabase Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      if (currentSession?.user) {
        await loadProfile(currentSession.user.id, currentSession.user.email);
      } else {
        setProfile(null);
        setRole(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, metadata?: { first_name?: string; last_name?: string }) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { 
        error: new Error('Unable to create account. Supabase client is not initialized.') 
      };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            first_name: metadata?.first_name,
            last_name: metadata?.last_name,
          },
        },
      });

      if (error) return { error };

      if (data.user) {
        await loadProfile(data.user.id, data.user.email);
      }
      return { error: null, data };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { 
        error: new Error('Unable to sign in. Supabase connection is not available.') 
      };
    }

    try {
      // Authenticate against Supabase Auth (auth.users)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        return { error };
      }

      if (!data.user) {
        return { error: new Error('No user returned after authentication.') };
      }

      // 1. Get the authenticated user's UUID
      const userUuid = data.user.id;

      // 2. Query profiles where id equals that UUID
      const { data: profileRow, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userUuid)
        .maybeSingle();

      if (profileError) {
        console.warn('Profile fetch note:', profileError.message);
      }

      // 3. Read the role
      const userRole: UserRole = profileRow?.role === 'admin' ? 'admin' : 'user';

      // Update state
      setUser(data.user);
      setSession(data.session);
      setRole(userRole);

      if (profileRow) {
        setProfile({
          id: profileRow.id,
          email: profileRow.email || data.user.email,
          role: userRole,
          full_name: profileRow.full_name || `${profileRow.first_name || ''} ${profileRow.last_name || ''}`.trim() || undefined,
          first_name: profileRow.first_name,
          last_name: profileRow.last_name,
          created_at: profileRow.created_at,
        });
      } else {
        setProfile({
          id: userUuid,
          email: data.user.email,
          role: userRole,
        });
      }

      return { error: null, data, role: userRole };
    } catch (err: any) {
      return { error: err };
    }
  };

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const sendPasswordReset = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: new Error('Supabase client is not available.') };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const updatePassword = async (newPassword: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: new Error('Supabase client is not available.') };
    }
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      return { error };
    } catch (err: any) {
      return { error: err };
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await loadProfile(user.id, user.email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        session,
        isLoading,
        isConfigured: isSupabaseConfigured,
        signUp,
        signIn,
        signOut,
        sendPasswordReset,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
