-- Database Schema for Order Tracking System
-- MySQL

-- Create database (jika belum ada)
-- CREATE DATABASE IF NOT EXISTS order_tracking_system;
-- USE order_tracking_system;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  nama VARCHAR(255) NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'gudang', 'packing') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(36) PRIMARY KEY,
  order_id_marketplace VARCHAR(255) UNIQUE NOT NULL,
  nama_pembeli VARCHAR(255) NOT NULL,
  platform_penjualan ENUM('Shopee', 'Tokopedia', 'Blibli') NOT NULL,
  status ENUM('DIBUAT', 'DITERIMA_GUDANG', 'PACKING', 'DIKIRIM', 'SELESAI', 'DIBATALKAN') NOT NULL DEFAULT 'DIBUAT',
  tanggal_pemesanan DATE NOT NULL,
  total_harga DECIMAL(15, 2) NOT NULL,
  keterangan TEXT,
  expedisi VARCHAR(255) NOT NULL,
  resi VARCHAR(255) NULL,
  qr_token VARCHAR(255) UNIQUE NOT NULL,
  created_by VARCHAR(36) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT
);

-- Order Items Table
CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(36) PRIMARY KEY,
  order_id VARCHAR(36) NOT NULL,
  nama_produk VARCHAR(255) NOT NULL,
  qty INT NOT NULL CHECK (qty > 0),
  harga_satuan DECIMAL(15, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_order_id_marketplace ON orders(order_id_marketplace);
CREATE INDEX IF NOT EXISTS idx_orders_qr_token ON orders(qr_token);
CREATE INDEX IF NOT EXISTS idx_orders_resi ON orders(resi);
-- Note: MySQL doesn't support partial unique index with WHERE clause
-- Uniqueness for resi (when not NULL) is handled in application layer
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_by ON orders(created_by);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
