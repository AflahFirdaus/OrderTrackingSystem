"use client";

import { usePathname } from "next/navigation";
import Container from "../container";
import { ThemeToggle } from "../theme-toggle";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/users": "Users",
  "/scan": "Scan QR",
};

export default function TopNavDynamic() {
  const pathname = usePathname();
  const title = titleMap[pathname] || "Dashboard";

  return (
    <Container className="flex h-16 items-center justify-between border-b border-border">
      <h1 className="text-2xl font-medium">{title}</h1>
      <ThemeToggle />
    </Container>
  );
}
