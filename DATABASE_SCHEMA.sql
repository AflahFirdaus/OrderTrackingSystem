-- Database Schema for Order Tracking System
-- PostgreSQL / Supabase

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'gudang', 'packing')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id_marketplace VARCHAR(255) UNIQUE NOT NULL,
  nama_pembeli VARCHAR(255) NOT NULL,
  platform_penjualan VARCHAR(50) NOT NULL CHECK (platform_penjualan IN ('Shopee', 'Tokopedia', 'Blibli')),
  status VARCHAR(50) NOT NULL DEFAULT 'DIBUAT' CHECK (status IN ('DIBUAT', 'DITERIMA_GUDANG', 'PACKING', 'DIKIRIM', 'SELESAI', 'DIBATALKAN')),
  tanggal_pemesanan DATE NOT NULL,
  total_harga DECIMAL(15, 2) NOT NULL,
  keterangan TEXT,
  expedisi VARCHAR(255) NOT NULL,
  resi VARCHAR(255),
  qr_token VARCHAR(255) UNIQUE NOT NULL,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  nama_produk VARCHAR(255) NOT NULL,
  qty INTEGER NOT NULL CHECK (qty > 0),
  harga_satuan DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_id_marketplace ON orders(order_id_marketplace);
CREATE INDEX IF NOT EXISTS idx_orders_qr_token ON orders(qr_token);
CREATE INDEX IF NOT EXISTS idx_orders_resi ON orders(resi);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_resi_unique ON orders (resi) WHERE resi IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at BEFORE UPDATE ON order_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- IMPORTANT: RLS DISABLED
-- Karena kita menggunakan cookie-based authentication di application layer,
-- kita tidak perlu Row Level Security di database level.
-- Auth dan authorization di-handle di Next.js API routes.

-- Jika RLS sudah di-enable sebelumnya dan menyebabkan error, jalankan:
-- ALTER TABLE users DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
-- 
-- Dan hapus semua policies dengan:
-- DROP POLICY IF EXISTS "Users can read own data" ON users;
-- DROP POLICY IF EXISTS "Admins can manage users" ON users;
-- DROP POLICY IF EXISTS "Users can read orders" ON orders;
-- DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
-- DROP POLICY IF EXISTS "Users can read order items" ON order_items;
