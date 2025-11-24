-- ============================================================================
-- ADD MISSING SELLER REGISTRATION COLUMNS
-- ============================================================================
-- This adds all missing columns needed for the multi-step seller registration
-- ============================================================================

BEGIN;

-- Add missing columns to seller_profiles
ALTER TABLE public.seller_profiles 
ADD COLUMN IF NOT EXISTS registration_step INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS registration_completed BOOLEAN DEFAULT false,

-- Address fields
ADD COLUMN IF NOT EXISTS business_address_line1 TEXT,
ADD COLUMN IF NOT EXISTS business_address_line2 TEXT,
ADD COLUMN IF NOT EXISTS business_city TEXT,
ADD COLUMN IF NOT EXISTS business_state TEXT,
ADD COLUMN IF NOT EXISTS business_postal_code TEXT,
ADD COLUMN IF NOT EXISTS business_country TEXT DEFAULT 'US',

-- Banking fields
ADD COLUMN IF NOT EXISTS preferred_payout_method TEXT DEFAULT 'bank_transfer',
ADD COLUMN IF NOT EXISTS bank_account_holder_name TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS bank_account_type TEXT,
ADD COLUMN IF NOT EXISTS bank_routing_number TEXT,
ADD COLUMN IF NOT EXISTS bank_account_last4 TEXT,
ADD COLUMN IF NOT EXISTS paypal_email TEXT,
ADD COLUMN IF NOT EXISTS crypto_wallet_address TEXT,

-- Shipping fields
ADD COLUMN IF NOT EXISTS ships_from_location TEXT,
ADD COLUMN IF NOT EXISTS shipping_countries TEXT[],
ADD COLUMN IF NOT EXISTS processing_time_min INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS processing_time_max INTEGER DEFAULT 3,
ADD COLUMN IF NOT EXISTS return_policy TEXT,
ADD COLUMN IF NOT EXISTS refund_policy TEXT,
ADD COLUMN IF NOT EXISTS shipping_policy TEXT,

-- Legal acceptance fields
ADD COLUMN IF NOT EXISTS terms_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS privacy_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS seller_agreement_accepted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_agreement_accepted_at TIMESTAMPTZ,

-- Additional verification
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,

-- Seller metrics
ADD COLUMN IF NOT EXISTS total_sales NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_listings INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS rating_average NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_reviews INTEGER DEFAULT 0;

-- Create index on registration_step
CREATE INDEX IF NOT EXISTS idx_seller_profiles_registration_step ON public.seller_profiles(registration_step);

COMMIT;

-- ============================================================================
-- DEPLOYMENT COMPLETE!
-- ============================================================================
-- Added all missing columns needed for multi-step seller registration:
-- ✅ registration_step (tracks which step user is on)
-- ✅ registration_completed (marks completion)
-- ✅ Address fields (business location)
-- ✅ Banking fields (payout information)
-- ✅ Shipping fields (fulfillment settings)
-- ✅ Legal acceptance fields (terms, privacy, agreement)
-- ✅ Verification flags (phone, email)
-- ✅ Metrics (sales, listings, ratings)
--
-- Next Steps:
-- 1. Run this SQL in Supabase
-- 2. Try seller registration - should work now!
-- ============================================================================

