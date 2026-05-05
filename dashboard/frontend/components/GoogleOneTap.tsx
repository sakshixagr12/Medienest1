'use client';

import { useEffect } from 'react';
import Script from 'next/script';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function GoogleOneTap() {
  const supabase = createClient();
  const router = useRouter();

  const handleCredentialResponse = async (response: any) => {
    try {
      console.log('🌐 GoogleOneTap: Credential received from Google');
      console.log('📦 Google Token Length:', response.credential?.length);
      
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('❌ Supabase Auth Error Object:', error);
        throw error;
      }

      if (data?.user) {
        console.log('✅ GoogleOneTap: Login successful for:', data.user.email);
        router.replace('/portal');
      }
    } catch (error: any) {
      console.error('❌ GoogleOneTap Exception:', error);
      if (error.status === 500) {
        console.error('💡 TIP: Check your Supabase Dashboard -> Authentication -> Providers -> Google. Ensure "Client Secret" is set and "Enabled" is ON.');
      }
    }
  };

  useEffect(() => {
    // Initialize Google Identity Services
    const initializeGsi = () => {
      if (!window.google || !window.google.accounts) return;

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false, // Turn off auto_select to avoid FedCM conflicts
        cancel_on_tap_outside: true,
      });

      // Only prompt if we are reasonably sure there is no active session yet
      // (The parent component should ideally handle this check too)
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.log('ℹ️ OneTap display issue:', notification.getNotDisplayedReason());
        }
      });
    };

    // Small delay to ensure script is fully ready and avoid race conditions
    const timer = setTimeout(() => {
      if (window.google) {
        initializeGsi();
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <Script
      src="https://accounts.google.com/gsi/client"
      strategy="afterInteractive"
    />
  );
}

// Add global type for google
declare global {
  interface Window {
    google: any;
  }
}
