import { createClient } from '@supabase/supabase-js'

// ============================================================
//  SUPABASE BAGLANTISI
//  Bu iki degeri Supabase panelinden al:
//  Project Settings -> API -> "Project URL" ve "anon public" key.
//  Bunlar herkese acik (public) anahtarlardir; RLS ile korunuyoruz.
// ============================================================
export const SUPABASE_URL = 'https://ncakilnfmwibmxriziou.supabase.co'
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5jYWtpbG5mbXdpYm14cml6aW91Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwMDIzMTMsImV4cCI6MjEwMjU3ODMxM30.6NlPz6P0PKmXZVXHTJaiNL8eztVFlnV44BEpJoYtt9g'

export const isConfigured = SUPABASE_URL.startsWith('https://') && !SUPABASE_URL.includes('YOUR-PROJECT')

export const supabase = isConfigured ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null
