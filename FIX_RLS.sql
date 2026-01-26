-- Fix RLS Policies untuk menghindari infinite recursion
-- Jalankan script ini di Supabase SQL Editor

-- Hapus semua existing policies yang bermasalah
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can manage users" ON users;
DROP POLICY IF EXISTS "Users can read orders" ON orders;
DROP POLICY IF EXISTS "Admins can manage orders" ON orders;
DROP POLICY IF EXISTS "Users can read order items" ON order_items;

-- Opsi 1: Disable RLS (RECOMMENDED untuk sistem ini karena kita handle auth di application layer)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;

-- Opsi 2: Jika tetap ingin menggunakan RLS, gunakan policy yang lebih sederhana
-- (Uncomment jika ingin menggunakan RLS, tapi Opsi 1 lebih disarankan)

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Policy sederhana: Allow semua karena auth di-handle di application layer
-- CREATE POLICY "Allow all for users" ON users FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all for orders" ON orders FOR ALL USING (true) WITH CHECK (true);
-- CREATE POLICY "Allow all for order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);
