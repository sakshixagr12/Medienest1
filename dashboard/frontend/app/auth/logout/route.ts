import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const supabase = await createServerSupabase();
  
  // Sign out from Supabase (clears session on server & sends clear cookie headers)
  await supabase.auth.signOut();

  const { origin } = new URL(request.url);
  return NextResponse.redirect(`${origin}/`, {
    status: 302,
  });
}

// Support GET for simple links if needed
export async function GET(request: Request) {
    return POST(request);
}
