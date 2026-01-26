export type UserRole = "admin" | "gudang" | "packing";

export type OrderStatus =
  | "DIBUAT"
  | "DITERIMA_GUDANG"
  | "PACKING"
  | "DIKIRIM"
  | "SELESAI"
  | "DIBATALKAN";

export type PlatformPenjualan = "Shopee" | "Tokopedia" | "Blibli";

export interface User {
  id: string;
  nama: string;
  username: string;
  password: string;
  role: UserRole;
  created_at?: string;
  updated_at?: string;
}

export interface Order {
  id: string;
  order_id_marketplace: string;
  nama_pembeli: string;
  platform_penjualan: PlatformPenjualan;
  status: OrderStatus;
  tanggal_pemesanan: string;
  total_harga: number;
  keterangan: string | null;
  expedisi: string;
  resi: string | null;
  qr_token: string;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  nama_produk: string;
  qty: number;
  harga_satuan: number;
  created_at?: string;
  updated_at?: string;
}

export interface OrderWithItems extends Order {
  order_items: OrderItem[];
  created_by_user?: User;
}
