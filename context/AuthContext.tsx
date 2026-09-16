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
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data?: any }>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  // For easy testing when Supabase env vars are still being configured in AI Studio
  setMockSession: (role: UserRole) => void;
  clearMockSession: () => void;
  isMockAuth: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isMockAuth, setIsMockAuth] = useState<boolean>(false);

  // Load user profile from Supabase profiles table
  const loadProfile = async (userId: string, userEmail?: string) => {
    try {
      const userProfile = await fetchUserProfile(userId);
      if (userProfile) {
        setProfile(userProfile);
        setRole(userProfile.role);
      } else {
        // Fallback default profile if table doesn't have row yet
        const defaultProfile: UserProfile = {
          id: userId,
          email: userEmail,
          role: 'user',
        };
        setProfile(defaultProfile);
        setRole('user');
      }
    } catch (err) {
      console.warn('Failed to load profile from profiles table:', err);
      setRole('user');
    }
  };

  useEffect(() => {
    const supabase = getSupabaseClient();

    if (!supabase) {
      // Check if there was a saved mock session in localStorage
      const savedMock = localStorage.getItem('promptila_mock_role') as UserRole | null;
      if (savedMock && (savedMock === 'user' || savedMock === 'admin')) {
        setMockSession(savedMock);
      }
      setIsLoading(false);
      return;
    }

    // 1. Check active session
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

    // 2. Listen for auth state changes
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
      // If Supabase is not yet configured, provide helpful simulation
      const mockId = 'mock-user-' + Math.random().toString(36).substring(2, 9);
      const mockProfile: UserProfile = {
        id: mockId,
        email,
        role: 'user',
        first_name: metadata?.first_name,
        last_name: metadata?.last_name,
        full_name: `${metadata?.first_name || ''} ${metadata?.last_name || ''}`.trim(),
      };
      setProfile(mockProfile);
      setRole('user');
      setIsMockAuth(true);
      return { error: null, data: { user: { id: mockId, email } } };
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
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
      // Mock login for preview testing when environment variables are pending
      const mockRole: UserRole = email.toLowerCase().includes('admin') ? 'admin' : 'user';
      setMockSession(mockRole);
      return { error: null };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  const signOut = async () => {
    const supabase = getSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
    clearMockSession();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  const sendPasswordReset = async (email: string) => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      return { error: null };
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
      return { error: null };
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

  const setMockSession = (newRole: UserRole) => {
    const mockUser: any = {
      id: `preview-${newRole}-id`,
      email: newRole === 'admin' ? 'admin@promptila.com' : 'client@promptila.com',
      created_at: new Date().toISOString(),
    };
    const mockProf: UserProfile = {
      id: mockUser.id,
      email: mockUser.email,
      role: newRole,
      full_name: newRole === 'admin' ? 'Promptila Executive Admin' : 'Sarah Jenkins',
      first_name: newRole === 'admin' ? 'Admin' : 'Sarah',
      last_name: newRole === 'admin' ? 'Lead' : 'Jenkins',
      created_at: new Date().toISOString(),
    };
    setUser(mockUser);
    setProfile(mockProf);
    setRole(newRole);
    setIsMockAuth(true);
    localStorage.setItem('promptila_mock_role', newRole);
  };

  const clearMockSession = () => {
    setIsMockAuth(false);
    localStorage.removeItem('promptila_mock_role');
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
        setMockSession,
        clearMockSession,
        isMockAuth,
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
