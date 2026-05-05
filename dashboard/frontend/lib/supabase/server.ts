import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

const HARDCODED_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wmmxvgpwvhjcpyhgcpzw.supabase.co';
const HARDCODED_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtbXh2Z3B3dmhqY3B5aGdjcHp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MjgwNzgsImV4cCI6MjA5MTEwNDA3OH0.4gYcjTwRU9sqQc_XmFtUy0DSQLn2Qrx2fu27snHda5w';

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    HARDCODED_URL,
    HARDCODED_KEY,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            // Ignore if called from Server Component
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch (error) {
            // Ignore if called from Server Component
          }
        },
      },
    }
  );
}

export function createMiddlewareSupabase(request: any, response: any) {
  return createServerClient(
    HARDCODED_URL,
    HARDCODED_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = response || {}; 
          if (response.cookies) {
             response.cookies.set({ name, value, ...options });
          }
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          if (response.cookies) {
             response.cookies.set({ name, value: '', ...options });
          }
        },
      },
    }
  );
}
