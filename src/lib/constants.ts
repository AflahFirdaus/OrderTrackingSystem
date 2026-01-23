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
