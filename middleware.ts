import { updateSession } from "@/lib/Mysql/auth";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Always redirect root path to login if not authenticated
  // This will be handled by updateSession
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api routes (handled separately)
     */
    "/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
