import { createBrowserClient } from "@supabase/ssr";
import { getMockSupabaseClient } from "./mockSupabaseClient";

export function createClient() {
  if (
    typeof window !== "undefined" &&
    (window.location.pathname.startsWith("/demo") ||
      window.location.pathname.startsWith("/view-pat") ||
      window.location.pathname === "/view/ae1163db-5002-4341-9cfe-535860ce2593")
  ) {
    return getMockSupabaseClient() as any;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "[Supabase] NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env.local",
    );
  }

  return createBrowserClient(url, anonKey);
}
