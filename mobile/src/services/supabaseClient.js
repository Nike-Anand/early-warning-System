import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://omvlvuacjmcsgmoqbwvu.supabase.co';
// Use Secret Key to bypass RLS policies on field_reports table
const SUPABASE_KEY = 'sb_secret_CeDUOIR-9W7xJroG8K8u9A_dDOYiLIq';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const SUPABASE_REPORTS_TABLE = 'field_reports';
