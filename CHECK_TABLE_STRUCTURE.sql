-- Check existing table structures
-- Run this first to see what columns actually exist

-- 1. Check high_scores table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'high_scores'
ORDER BY ordinal_position;

-- 2. Check game_scores table structure  
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_scores'
ORDER BY ordinal_position;

-- 3. Check game_history table structure
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'game_history'
ORDER BY ordinal_position;

-- 4. List all tables in public schema
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
