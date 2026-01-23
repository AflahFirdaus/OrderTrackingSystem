"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import Image from "next/image";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { USER_ROLES } from "@/lib/constants";
import type { UserRole } from "@/types/database";

export default function User() {
  const router = useRouter();
  const [user, setUser] = useState<{ nama: string; role: UserRole } | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex h-16 items-center border-b border-border px-2">
        <div className="flex w-full items-center justify-between rounded-md px-2 py-1">
          <div className="flex items-center">
            <div className="mr-2 h-9 w-9 rounded-full bg-muted" />
            <div className="flex flex-col">
              <span className="text-sm font-medium">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-16 items-center border-b border-border px-2">
      <DropdownMenu>
        <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-md px-2 py-1 hover:bg-slate-200 dark:hover:bg-slate-800">
          <div className="flex items-center">
            <Image
              src="/avatar.png"
              alt="User"
              className="mr-2 rounded-full"
              width={36}
              height={36}
            />
            <div className="flex flex-col">
              <span className="text-sm font-medium">{user.nama}</span>
              <span className="text-xs text-muted-foreground">
                {USER_ROLES[user.role]}
              </span>
            </div>
          </div>
          <ChevronDown size={16} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleLogout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
