import { randomBytes } from "crypto";

export function generateQrToken(): string {
  return randomBytes(32).toString("hex");
}

export function getQrUrl(token: string): string {
  if (typeof window !== "undefined") {
    // Client-side
    return `${window.location.origin}/scan/${token}`;
  }
  // Server-side
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}/scan/${token}`;
}
