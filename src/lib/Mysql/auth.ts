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

export async function updateSession(request: NextRequest) {
  const userId = request.cookies.get("user_id")?.value;
  const response = NextResponse.next();

  // If no user_id cookie, allow request to continue (will be handled by page-level auth)
  if (!userId) {
    return response;
  }

  // Verify user exists in database
  try {
    const user = await queryOne<User>(
      "SELECT id, nama, username, role FROM users WHERE id = ?",
      [userId]
    );

    if (!user) {
      // User doesn't exist, clear cookies
      response.cookies.delete("user_id");
      response.cookies.delete("user_role");
      return response;
    }

    // Update user_role cookie if it doesn't match
    const currentRole = request.cookies.get("user_role")?.value;
    if (currentRole !== user.role) {
      response.cookies.set("user_role", user.role, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }
  } catch (error) {
    // If database error, clear cookies
    console.error("Error verifying user in middleware:", error);
    response.cookies.delete("user_id");
    response.cookies.delete("user_role");
  }

  return response;
}
