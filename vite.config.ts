import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

function normalizeSupabaseUrl(url?: string): string {
  if (!url) return '';
  let clean = url.trim();
  clean = clean.replace(/\/+$/, '');
  clean = clean.replace(/\/rest\/v1\/?$/i, '');
  clean = clean.replace(/\/+$/, '');
  return clean;
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const rawSupabaseUrl = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
    const cleanSupabaseUrl = normalizeSupabaseUrl(rawSupabaseUrl);
    const supabaseKey = env.SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      envPrefix: ['VITE_', 'SUPABASE_'],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.SUPABASE_URL': JSON.stringify(cleanSupabaseUrl),
        'process.env.SUPABASE_PUBLISHABLE_KEY': JSON.stringify(supabaseKey),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
