import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";


/**
 * SessionGuard – protects client‑side routes.
 * It checks for an active Supabase session, verifies the JWT expiry
 * and ensures the user's email is confirmed. If any check fails, the
 * user is redirected to the authentication page.
 */
export default function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const guard = async () => {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        router.replace("/auth");
        return;
      }
      // Decode JWT payload (base64) to inspect `exp` and `email_confirmed_at` claims.
      const payloadB64 = session.access_token.split(".")[1];
      try {
        const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
        const nowSec = Math.floor(Date.now() / 1000);
        if (payload.exp && payload.exp < nowSec) {
          // Token expired – force sign‑out then redirect.
          await supabase.auth.signOut();
          router.replace("/auth");
          return;
        }
        if (!payload.email_confirmed_at && !(payload.app_metadata && payload.app_metadata.email_verified)) {
          router.replace("/auth?unverified=true");
          return;
        }
      } catch (e) {
        console.error("SessionGuard payload decode error", e);
        router.replace("/auth");
        return;
      }
    };
    guard();
  }, [router]);

  return <>{children}</>;
}
