import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const cleanEnvVar = (val?: string): string => {
  if (!val) return '';
  return val.trim().split(/[\s\r\n]+/)[0].replace(/['";]/g, '');
};

// Check if GEMINI_API_KEY was accidentally pasted into SUPABASE_SERVICE_ROLE_KEY
const rawServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (rawServiceKey.includes('GEMINI_API_KEY=')) {
  const match = rawServiceKey.match(/GEMINI_API_KEY=\s*([^\s\r\n]+)/);
  if (match && (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'placeholder-key')) {
    process.env.GEMINI_API_KEY = match[1].replace(/['";]/g, '').trim();
  }
}

const supabaseUrl = cleanEnvVar(process.env.SUPABASE_URL) || 'https://placeholder.supabase.co';
const supabaseServiceKey = cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY) || cleanEnvVar(process.env.SUPABASE_ANON_KEY) || 'placeholder-anon-key';
const supabaseAnonKey = cleanEnvVar(process.env.SUPABASE_ANON_KEY) || 'placeholder-anon-key';

export const isSupabaseConfigured = Boolean(
  cleanEnvVar(process.env.SUPABASE_URL) && cleanEnvVar(process.env.SUPABASE_ANON_KEY)
);

export const hasServiceRoleKey = Boolean(
  cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
  cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY) !== 'placeholder-anon-key' &&
  cleanEnvVar(process.env.SUPABASE_SERVICE_ROLE_KEY) !== cleanEnvVar(process.env.SUPABASE_ANON_KEY)
);

// Service client for admin operations (server-side only)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Anon client for verifying user JWTs
export const supabaseAnon = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper to get client scoped to the calling user (preserves RLS with user token)
export const createUserClient = (accessToken?: string) => {
  if (hasServiceRoleKey) {
    return supabaseAdmin;
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken ? {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    } : undefined,
  });
};
