import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sbbinqrgczoynwizmnwc.supabase.co';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNiYmlucXJnY3pveW53aXptbndjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NjM1MDMsImV4cCI6MjA5NjMzOTUwM30.M4wZIozWu_jbjISfNRA_D875OvmGMJsWbA1aJ0hwI30';

  return createBrowserClient(url, anonKey);
}
