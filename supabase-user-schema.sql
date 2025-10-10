-- DropDollar User Profiles and Data Schema
-- This schema handles all user data, tokens, transactions, and withdrawals

-- User Profiles Table
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  tokens INTEGER DEFAULT 0,
  balance DECIMAL(10,2) DEFAULT 0.00,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Token Transactions Table
CREATE TABLE IF NOT EXISTS token_transactions (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('purchase', 'spend', 'earn', 'refund')),
  amount INTEGER NOT NULL,
  description TEXT NOT NULL,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Withdrawal Requests Table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  stripeAccountId TEXT,
  payoutId TEXT,
  requestedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completedAt TIMESTAMP WITH TIME ZONE
);

-- Bank Accounts Table (for Stripe Connect)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id SERIAL PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripeAccountId TEXT NOT NULL UNIQUE,
  bankName TEXT,
  accountType TEXT,
  last4 TEXT,
  isVerified BOOLEAN DEFAULT FALSE,
  isOnboarded BOOLEAN DEFAULT FALSE,
  chargesEnabled BOOLEAN DEFAULT FALSE,
  payoutsEnabled BOOLEAN DEFAULT FALSE,
  country TEXT DEFAULT 'US',
  email TEXT,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updatedAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Intents Table (for tracking purchases)
CREATE TABLE IF NOT EXISTS payment_intents (
  id TEXT PRIMARY KEY,
  userId TEXT NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('tokens', 'listing', 'tournament', 'match', 'hotsell', 'ad_campaign')),
  metadata JSONB,
  createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_token_transactions_user_id ON token_transactions(userId);
CREATE INDEX IF NOT EXISTS idx_token_transactions_created_at ON token_transactions(createdAt);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user_id ON withdrawal_requests(userId);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user_id ON bank_accounts(userId);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_stripe_account_id ON bank_accounts(stripeAccountId);
CREATE INDEX IF NOT EXISTS idx_payment_intents_user_id ON payment_intents(userId);
CREATE INDEX IF NOT EXISTS idx_payment_intents_status ON payment_intents(status);

-- Create updatedAt trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedAt = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updatedAt
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data for testing (optional)
-- INSERT INTO user_profiles (id, username, firstName, lastName, email, tokens, balance) 
-- VALUES ('sample_user_1', 'testuser', 'Test', 'User', 'test@dropdollar.com', 100, 50.00)
-- ON CONFLICT (id) DO NOTHING;
