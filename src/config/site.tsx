import { Gauge, type LucideIcon, QrCode, Package, Users as UsersIcon } from "lucide-react";
import type { UserRole } from "@/types/database";

export type SiteConfig = typeof siteConfig;
export type Navigation = {
  icon: LucideIcon;
  name: string;
  href: string;
  roles?: UserRole[];
};

export const siteConfig = {
  title: "Order Tracking System",
  description: "Sistem tracking order dari marketplace",
};

export const getNavigations = (role?: UserRole): Navigation[] => {
  const allNavs: Navigation[] = [
    {
      icon: Gauge,
      name: "Dashboard",
      href: "/",
      roles: ["admin"],
    },
    {
      icon: Package,
      name: "Orders",
      href: "/orders",
      roles: ["admin"],
    },
    {
      icon: UsersIcon,
      name: "Users",
      href: "/users",
      roles: ["admin"],
    },
    {
      icon: QrCode,
      name: "Scan QR",
      href: "/scan",
      roles: ["gudang", "packing"],
    },
  ];

  if (!role) return [];
  return allNavs.filter((nav) => !nav.roles || nav.roles.includes(role));
};
