"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getNavigations } from "@/config/site";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types/database";

export default function Navigation() {
  const pathname = usePathname();
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUserRole(data.user.role);
        }
      })
      .catch(() => {});
  }, []);

  const navigations = getNavigations(userRole || undefined);

  return (
    <nav className="flex flex-grow flex-col gap-y-1 p-2">
      {navigations.map((navigation) => {
        const Icon = navigation.icon;
        return (
          <Link
            key={navigation.name}
            href={navigation.href}
            className={cn(
              "flex items-center rounded-md px-2 py-1.5 hover:bg-slate-200 dark:hover:bg-slate-800",
              pathname === navigation.href || (navigation.href !== "/" && pathname.startsWith(navigation.href))
                ? "bg-slate-200 dark:bg-slate-800"
                : "bg-transparent",
            )}
          >
            <Icon
              size={16}
              className="mr-2 text-slate-800 dark:text-slate-200"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              {navigation.name}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
