const getApiBaseUrl = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Dynamic fallback for browser-side execution
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';

    if (isLocal) {
      return 'http://localhost:4001';
    } else if (!process.env.NEXT_PUBLIC_API_URL) {
      // Production Self-Healing: Warn if migration is incomplete
      console.warn(
        '%c⚠️ MediNest Deployment Alert:',
        'color: #ff9800; font-weight: bold; font-size: 14px;',
        '\nMissing NEXT_PUBLIC_API_URL on this live domain. Using localhost fallback (which will likely fail). \nEnsure you have added your Render URL to your Vercel Dashboard.'
      );
    }
  }

  return 'http://localhost:4001'; // Default fallback
};

import { createClient } from './supabase/client';

export const API_BASE_URL = getApiBaseUrl();

export const authenticatedFetch = async (url: string, options: RequestInit = {}) => {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = new Headers(options.headers || {});
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`);
  }

  return fetch(url, {
    ...options,
    headers
  });
};
