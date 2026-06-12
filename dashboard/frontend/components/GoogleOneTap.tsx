"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const generateNonce = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

export default function GoogleOneTap() {
  const supabase = createClient();
  const router = useRouter();
  const nonceRef = useRef<string>("");

  const handleCredentialResponse = async (response: any) => {
    try {
      console.log("GoogleOneTap: Credential received from Google");

      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: nonceRef.current || undefined,
      });

      if (error) {
        console.error("Supabase Auth Error Object:", error);
        throw error;
      }

      if (data?.user) {
        console.log("GoogleOneTap: Login successful for:", data.user.email);
        router.replace("/portal");
      }
    } catch (error: any) {
      console.error("GoogleOneTap Exception:", error);
      if (error.status === 500) {
        console.error(
          'TIP: Check your Supabase Dashboard -> Authentication -> Providers -> Google. Ensure "Client Secret" is set and "Enabled" is ON.',
        );
      }
    }
  };

  useEffect(() => {
    // Initialize Google Identity Services
    const initializeGsi = async () => {
      if (!window.google || !window.google.accounts) return;

      // Disable Google One Tap on localhost to prevent Authorized Origins 403 errors
      // and FedCM console warnings during local development.
      const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
      if (isLocal) {
        console.log("GoogleOneTap: Bypassed on localhost to prevent console origins noise.");
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) return;

      // Generate and hash nonce for security
      const rawNonce = generateNonce();
      nonceRef.current = rawNonce;
      const hashedNonce = await sha256(rawNonce);

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        nonce: hashedNonce,
        auto_select: false, // Turn off auto_select to avoid FedCM conflicts
        use_fedcm_for_prompt: false, // Fall back to older popup window to avoid FedCM NetworkError
        cancel_on_tap_outside: true,
      });

      // Only prompt if we are reasonably sure there is no active session yet
      // (The parent component should ideally handle this check too)
      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          console.log(
            "ℹ️ OneTap display issue:",
            notification.getNotDisplayedReason(),
          );
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
