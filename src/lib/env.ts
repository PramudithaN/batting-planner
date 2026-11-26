import { z } from 'zod';

const envSchema = z.object({
  VITE_SUPABASE_URL: z.string().url().optional().or(z.literal('')),
  VITE_SUPABASE_ANON_KEY: z.string().optional().or(z.literal('')),
});

const parsed = envSchema.safeParse({
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? '',
  VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
});

export const env = parsed.success
  ? {
      supabaseUrl: parsed.data.VITE_SUPABASE_URL || '',
      supabaseAnonKey: parsed.data.VITE_SUPABASE_ANON_KEY || '',
    }
  : {
      supabaseUrl: '',
      supabaseAnonKey: '',
    };

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
