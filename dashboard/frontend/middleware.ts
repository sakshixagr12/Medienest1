import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createMiddlewareSupabase(request, response);

  // 1. Verify User Session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 2. Protected Routes (Portal, Onboarding, Pending)
  const isProtectedRoute =
    pathname.startsWith("/portal") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/pending");

  // 3. Auth Routes (Login/Register)
  const isAuthRoute = pathname.startsWith("/auth");
  const isLandingRoute = pathname === "/";

  // --- LOGIC FOR LOGGED-OUT USERS ---
  if (!user) {
    if (isProtectedRoute) {
      return NextResponse.redirect(new URL("/auth", request.url));
    }
    return response;
  }

  // --- LOGIC FOR LOGGED-IN USERS ---

  // If user is logged in, we need to know their clinic status for routing decisions
  // We only fetch this if they are hitting /auth or / or a protected route
  // to minimize DB load on every static asset request (handled by matcher though)

  const { data: clinics } = await supabase
    .from("clinics")
    .select("id, status, created_at")
    .eq("owner_user_id", user.id);

  let clinicStatus: string | null = null;
  let activeClinic: any = null;

  if (clinics && clinics.length > 0) {
    activeClinic =
      clinics.find((c) => c.status === "active") ||
      clinics.find((c) => c.status === "pending") ||
      clinics[0];
    clinicStatus = activeClinic.status || null;
  }

  // Case A: Trying to hit Login or Landing while already logged in
  if (isAuthRoute || isLandingRoute) {
    if (!clinicStatus)
      return NextResponse.redirect(new URL("/onboarding", request.url));
    if (clinicStatus === "pending")
      return NextResponse.redirect(new URL("/pending", request.url));
    return NextResponse.redirect(new URL("/portal", request.url));
  }

  // Case B: Accessing Portal/Onboarding/Pending - ensure they are in the right sub-page
  if (isProtectedRoute) {
    if (!clinicStatus && !pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", request.url));
    }
    if (clinicStatus === "pending" && !pathname.startsWith("/pending")) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }
    if (
      clinicStatus === "active" &&
      (pathname.startsWith("/onboarding") || pathname.startsWith("/pending"))
    ) {
      return NextResponse.redirect(new URL("/portal", request.url));
    }
  }

  // Case C: Check Trial/Subscription status for Active clinics trying to access portal pages
  if (
    clinicStatus === "active" &&
    pathname.startsWith("/portal") &&
    !pathname.startsWith("/portal/clinic-settings")
  ) {
    // Check trial expiration (14 days from created_at)
    let isTrialActive = false;
    if (activeClinic && activeClinic.created_at) {
      const createdAt = new Date(activeClinic.created_at);
      const trialEnd = new Date(createdAt);
      trialEnd.setDate(trialEnd.getDate() + 14);
      isTrialActive = new Date() < trialEnd;
    }

    // Check active subscription
    let isSubscriptionActive = false;
    if (activeClinic) {
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("status, end_date")
        .eq("clinic_id", activeClinic.id)
        .maybeSingle();

      if (
        subscription &&
        subscription.status === "active" &&
        new Date(subscription.end_date) > new Date()
      ) {
        isSubscriptionActive = true;
      }
    }

    if (!isTrialActive && !isSubscriptionActive) {
      return NextResponse.redirect(
        new URL("/portal/clinic-settings?expired=true", request.url)
      );
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
