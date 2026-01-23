import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Allow login page and API auth routes without authentication
  if (
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Check if user is authenticated via cookie
  const userId = request.cookies.get("user_id")?.value;

  // If no user_id cookie, redirect to login
  if (!userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // User is authenticated, allow access
  return NextResponse.next();
}
