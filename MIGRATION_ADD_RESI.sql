-- Migration: Add resi field and remove ongkir field (if exists)
-- Run this in Supabase SQL Editor

-- Step 1: Add resi field to orders table (nullable initially)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS resi VARCHAR(255);

-- Step 2: Create unique index on resi (allows NULL values)
-- PostgreSQL unique constraint allows multiple NULL values, which is what we want
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_resi_unique 
ON orders (resi) 
WHERE resi IS NOT NULL;

-- Step 3: Add index for faster resi lookups
CREATE INDEX IF NOT EXISTS idx_orders_resi ON orders (resi);

-- Step 4: Remove ongkir column if it exists (it might not exist in database, only in form)
-- Uncomment the line below if ongkir column exists in your database
-- ALTER TABLE orders DROP COLUMN IF EXISTS ongkir;

-- Note: The ongkir field in the form will be removed in the code update.
-- This migration only handles database changes.
