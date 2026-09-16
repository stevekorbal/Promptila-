import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { UserProfile, ServiceRecord, ServicePlanId } from '../types.ts';

// Extract Supabase environment variables safely
const supabaseUrl = 
  (typeof process !== 'undefined' && process.env && (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL)) ||
  // @ts-ignore
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL)) ||
  '';

const supabasePublishableKey = 
  (typeof process !== 'undefined' && process.env && (process.env.SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)) ||
  // @ts-ignore
  (typeof import.meta !== 'undefined' && import.meta.env && (import.meta.env.SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY)) ||
  '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabasePublishableKey && 
  supabaseUrl.startsWith('http')
);

// Lazy or safe client initialization
let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) {
    return null;
  }
  if (!clientInstance) {
    try {
      clientInstance = createClient(supabaseUrl, supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
    } catch (err) {
      console.warn('Failed to initialize Supabase client:', err);
      return null;
    }
  }
  return clientInstance;
}

export const supabase = getSupabaseClient();

/**
 * Fetch profile from `profiles` table for given user id
 */
export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.warn('Error fetching profile:', error.message);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      email: data.email,
      role: data.role === 'admin' ? 'admin' : 'user',
      full_name: data.full_name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || undefined,
      first_name: data.first_name,
      last_name: data.last_name,
      created_at: data.created_at,
    };
  } catch (err) {
    console.error('Unexpected error fetching profile:', err);
    return null;
  }
}

/**
 * Fetch services from `services` table
 */
export async function fetchServicesFromSupabase(): Promise<ServiceRecord[] | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  try {
    const { data, error } = await client
      .from('services')
      .select('*');

    if (error) {
      console.warn('Error fetching services from Supabase:', error.message);
      return null;
    }

    if (!data || data.length === 0) {
      return null;
    }

    return data.map((item: any) => ({
      id: item.id,
      slug: item.slug || (item.name ? item.name.toLowerCase().includes('blueprint') || item.name.toLowerCase().includes('diy') ? 'diy' : item.name.toLowerCase().includes('monitoring') ? 'monitoring' : 'dfy' : undefined),
      name: item.name,
      description: item.description,
      price: Number(item.price) || 0,
      billing_type: item.billing_type === 'recurring' || item.billing_type === 'monthly' ? 'recurring' : 'one-time',
      created_at: item.created_at,
      features: item.features,
    }));
  } catch (err) {
    console.warn('Failed to load services from Supabase:', err);
    return null;
  }
}
