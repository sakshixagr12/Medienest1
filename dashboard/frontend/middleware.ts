import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAccessToken(request: NextRequest) {
  const cookiePrefix = 'sb-sbbinqrgczoynwizmnwc-auth-token';
  const cookies = request.cookies.getAll();
  
  const chunks = cookies
    .filter(c => c.name.startsWith(cookiePrefix + '.'))
    .sort((a, b) => {
      const aIdx = parseInt(a.name.replace(cookiePrefix + '.', ''), 10) || 0;
      const bIdx = parseInt(b.name.replace(cookiePrefix + '.', ''), 10) || 0;
      return aIdx - bIdx;
    })
    .map(c => c.value);

  if (chunks.length === 0) {
    const single = request.cookies.get(cookiePrefix);
    if (single) chunks.push(single.value);
  }

  if (chunks.length === 0) return null;

  try {
    const jsonStr = chunks.join('');
    const parsed = JSON.parse(jsonStr);
    return parsed?.access_token || parsed?.[0] || null;
  } catch (e) {
    return null;
  }
}

function createMiddlewareSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });
}





export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    // Bypass all authentication/redirection checks if Demo Mode is active
    if (pathname.startsWith("/demo")) {
      return response;
    }

    const supabase = createMiddlewareSupabase();
    const token = getAccessToken(request);

    // 1. Verify User Session
    let user = null;
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data?.user;
    }

    // 2. Protected Routes (Portal, Onboarding, Pending)
    const isProtectedRoute =
      pathname.startsWith("/portal") ||
      pathname.startsWith("/store") ||
      pathname.startsWith("/onboarding") ||
      pathname.startsWith("/pending");

    // 3. Auth Routes (Login/Register)
    const isAuthRoute = pathname.startsWith("/auth");
    const isLandingRoute = pathname === "/";

    const handleRedirect = (destUrl: string) => {
      const redirectResponse = NextResponse.redirect(new URL(destUrl, request.url));
      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          path: cookie.path,
          domain: cookie.domain,
          maxAge: cookie.maxAge,
          expires: cookie.expires,
          secure: cookie.secure,
          httpOnly: cookie.httpOnly,
          sameSite: cookie.sameSite,
        });
      });
      return redirectResponse;
    };

    // --- LOGIC FOR LOGGED-OUT USERS ---
    if (!user) {
      if (isProtectedRoute) {
        return handleRedirect("/auth");
      }
      return response;
    }

    // --- LOGIC FOR LOGGED-IN USERS ---

    // If user is logged in, we need to know their clinic status for routing decisions
    // We only fetch this if they are hitting /auth or / or a protected route
    // to minimize DB load on every static asset request (handled by matcher though)

    // 1. Get clinics owned by the user
    const { data: ownedClinics } = await supabase
      .from("clinics")
      .select("id, status, created_at, clinic_type")
      .eq("owner_user_id", user.id);

    // 2. Get clinics where user is an assigned doctor
    const { data: doctorProfile } = await supabase
      .from("doctors")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    let assignedClinics: any[] = [];
    if (doctorProfile) {
      const { data: doctorClinics } = await supabase
        .from("clinic_doctors")
        .select("clinic_id, clinics(id, status, created_at, clinic_type)")
        .eq("doctor_id", doctorProfile.id)
        .eq("is_active", true);

      if (doctorClinics) {
        assignedClinics = doctorClinics
          .map((dc: any) => dc.clinics)
          .filter(Boolean);
      }
    }

    const clinics = [...(ownedClinics || []), ...assignedClinics];

    let clinicStatus: string | null = null;
    let activeClinic: any = null;

    if (clinics && clinics.length > 0) {
      activeClinic =
        clinics.find((c) => c.status === "active") ||
        clinics.find((c) => c.status === "pending") ||
        clinics[0];
      clinicStatus = activeClinic.status || null;
    }

    const clinicType = activeClinic?.clinic_type || "clinic";

    // Case A: Trying to hit Login or Landing while already logged in
    if (isAuthRoute || isLandingRoute) {
      if (!clinicStatus)
        return handleRedirect("/onboarding");
      if (clinicStatus === "pending")
        return handleRedirect("/pending");
      if (clinicStatus === "inactive")
        return handleRedirect("/pending?expired=true");
      const dest = clinicType === "store" ? "/store" : "/portal";
      return handleRedirect(dest);
    }

    // Case B: Accessing Portal/Store/Onboarding/Pending - ensure they are in the right sub-page
    if (isProtectedRoute) {
      if (!clinicStatus && !pathname.startsWith("/onboarding")) {
        return handleRedirect("/onboarding");
      }
      if (clinicStatus === "pending" && !pathname.startsWith("/pending")) {
        return handleRedirect("/pending");
      }
      if (clinicStatus === "inactive" && !pathname.startsWith("/pending")) {
        return handleRedirect("/pending?expired=true");
      }
      if (
        clinicStatus === "active" &&
        (pathname.startsWith("/onboarding") || pathname.startsWith("/pending"))
      ) {
        const dest = clinicType === "store" ? "/store" : "/portal";
        return handleRedirect(dest);
      }
    }

    // Prevent Cross-Access for Active Users
    if (clinicStatus === "active") {
      if (clinicType === "store" && pathname.startsWith("/portal")) {
        return handleRedirect("/store");
      }
      if (clinicType === "clinic" && pathname.startsWith("/store")) {
        return handleRedirect("/portal");
      }
    }

    return response;
  } catch (error) {
    console.error("[Middleware Error]", error);
    // Don't crash — let the request through so the page can handle errors
    return NextResponse.next();
  }
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
