import type { OrderStatus, UserRole } from "@/types/database";

export const ORDER_STATUS_FLOW: OrderStatus[] = [
  "DIBUAT",
  "DITERIMA_GUDANG",
  "PACKING",
  "DIKIRIM",
  "SELESAI",
];

export const ORDER_STATUSES: Record<OrderStatus, string> = {
  DIBUAT: "Dibuat",
  DITERIMA_GUDANG: "Diterima Gudang",
  PACKING: "Packing",
  DIKIRIM: "Dikirim",
  SELESAI: "Selesai",
  DIBATALKAN: "Dibatalkan",
};

export const USER_ROLES: Record<UserRole, string> = {
  admin: "Admin",
  gudang: "Gudang",
  packing: "Packing",
};

export const PLATFORMS = ["Shopee", "Tokopedia", "Blibli"] as const;

export const EXPEDISI_OPTIONS = ["Reguler", "Instan", "Andi"] as const;

export function canProcessOrder(
  userRole: UserRole,
  currentStatus: OrderStatus
): boolean {
  if (currentStatus === "DIBATALKAN") {
    return false;
  }

  if (userRole === "gudang") {
    return currentStatus === "DIBUAT";
  }

  if (userRole === "packing") {
    return currentStatus === "DITERIMA_GUDANG";
  }

  return false;
}

export function getNextStatus(currentStatus: OrderStatus): OrderStatus | null {
  const currentIndex = ORDER_STATUS_FLOW.indexOf(currentStatus);
  if (currentIndex === -1 || currentIndex === ORDER_STATUS_FLOW.length - 1) {
    return null;
  }
  return ORDER_STATUS_FLOW[currentIndex + 1];
}

export function getStatusColor(status: OrderStatus): string {
  const colorMap: Record<OrderStatus, string> = {
    DIBUAT: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    DITERIMA_GUDANG: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
    PACKING: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    DIKIRIM: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300",
    SELESAI: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    DIBATALKAN: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  };
  return colorMap[status] || "bg-muted text-muted-foreground";
}
