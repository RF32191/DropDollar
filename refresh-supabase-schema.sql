-- Force Supabase Schema Cache Refresh
-- Run this in your Supabase SQL Editor to refresh the schema cache

-- Method 1: Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';

-- Method 2: Verify the users table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Method 3: Test if we can insert into users table (will show any missing columns)
-- This is just a test query - it won't actually insert anything
SELECT 
    'first_name' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
              AND column_name = 'first_name' 
              AND table_schema = 'public'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
UNION ALL
SELECT 
    'last_name' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
              AND column_name = 'last_name' 
              AND table_schema = 'public'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status
UNION ALL
SELECT 
    'username' as column_name,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'users' 
              AND column_name = 'username' 
              AND table_schema = 'public'
        ) THEN 'EXISTS' 
        ELSE 'MISSING' 
    END as status;

-- If columns are missing, this will recreate the users table with correct structure
-- ONLY run this if the above queries show missing columns
/*
DROP TABLE IF EXISTS public.users CASCADE;

CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone_number TEXT,
  role TEXT DEFAULT 'buyer' CHECK (role IN ('buyer', 'seller', 'admin')),
  is_verified BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  location_verified BOOLEAN DEFAULT false,
  location_state TEXT,
  location_city TEXT,
  location_country TEXT,
  location_allowed BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate indexes
CREATE INDEX idx_users_email ON public.users (email);
CREATE INDEX idx_users_username ON public.users (username);
CREATE INDEX idx_users_role ON public.users (role);
*/
