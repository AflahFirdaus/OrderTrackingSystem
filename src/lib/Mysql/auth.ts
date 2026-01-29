// lib/auth.ts
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { queryOne } from "./server";
import type { RowDataPacket } from "mysql2/promise";

interface User extends RowDataPacket {
  id: string;
  nama: string;
  username: string;
  role: string;
}

export async function requireUserId(): Promise<string> {
  const userId = (await cookies()).get("user_id")?.value;
  if (!userId) throw new Error("Unauthenticated");
  return userId;
}

const LOGIN_PATH = "/login";

export async function updateSession(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const pathname = request.nextUrl.pathname;

  // Jika belum login, arahkan ke halaman login (kecuali sudah di /login)
  if (!userId) {
    if (pathname === LOGIN_PATH) {
      return NextResponse.next();
    }
    const loginUrl = new URL(LOGIN_PATH, request.url);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  // Verify user exists in database
  try {
    const user = await queryOne<User>(
      "SELECT id, nama, username, role FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      const redirect = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
      redirect.cookies.delete("user_id");
      redirect.cookies.delete("user_role");
      return redirect;
    }

    // Update user_role cookie if it doesn't match
    const currentRole = request.cookies.get("user_role")?.value;
    if (currentRole !== user.role) {
      response.cookies.set("user_role", user.role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
      });
    }
  } catch (error) {
    console.error("Error verifying user in middleware:", error);
    const redirect = NextResponse.redirect(new URL(LOGIN_PATH, request.url));
    redirect.cookies.delete("user_id");
    redirect.cookies.delete("user_role");
    return redirect;
  }

  return response;
}
