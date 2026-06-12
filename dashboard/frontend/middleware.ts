import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  try {
    return NextResponse.next();
  } catch (error) {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
