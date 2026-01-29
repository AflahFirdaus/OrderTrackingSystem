"use client";

import { usePathname } from "next/navigation";
import Container from "../container";
import { ThemeToggle } from "../theme-toggle";

const titleMap: Record<string, string> = {
  "/": "Dashboard",
  "/orders": "Orders",
  "/users": "Users",
  "/scan": "Scan Barcode",
  "/packing": "Packing",
};

export default function TopNavDynamic() {
  const pathname = usePathname();
  const title = titleMap[pathname] || "Dashboard";

  return (
    <Container className="flex h-14 tablet:h-16 items-center justify-between gap-2 border-b border-border shrink-0">
      <h1 className="text-lg tablet:text-2xl font-medium truncate min-w-0">{title}</h1>
      <ThemeToggle />
    </Container>
  );
}
