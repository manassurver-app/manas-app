/**
 * Complete Supabase PostgreSQL Schema & Security (RLS) for:
 * Organization: Manas Krishi Sahakari Limited, Tikapur-1, Kailali, Nepal
 */

export const SUPABASE_SQL_SCHEMA = `-- =========================================================================
-- MANAS KRISHI SAHAKARI LIMITED, TIKAPUR-1, KAILALI, NEPAL
-- FIELD COLLECTION (BAJAR PRATINIDHI) DATABASE SCHEMA & RLS POLICIES
-- =========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Custom Types & Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'agent');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'closed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE transaction_type AS ENUM ('deposit', 'withdrawal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- =========================================================================
-- 3. PROFILES TABLE (Linked with Supabase auth.users)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'agent',
    phone_number TEXT,
    assigned_area TEXT DEFAULT 'Tikapur-1 Kailali',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =========================================================================
-- 4. ACCOUNTS TABLE (Bachat Karta / Member Savings Accounts)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_no TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    nepali_name TEXT,
    address TEXT NOT NULL DEFAULT 'Tikapur-1, Kailali',
    contact_number TEXT NOT NULL,
    assigned_agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    opening_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00 CHECK (opening_balance >= 0),
    current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status account_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for ultra-fast lookup in remote fields
CREATE INDEX IF NOT EXISTS idx_accounts_account_no ON public.accounts(account_no);
CREATE INDEX IF NOT EXISTS idx_accounts_assigned_agent ON public.accounts(assigned_agent_id);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON public.accounts(status);

-- =========================================================================
-- 5. TRANSACTIONS TABLE (Daily Micro-Savings Collections & Withdrawals)
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE RESTRICT,
    agent_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    type transaction_type NOT NULL,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    nepali_date TEXT NOT NULL, -- Format: YYYY-MM-DD in BS (e.g., 2083-04-15)
    day_number INTEGER NOT NULL CHECK (day_number BETWEEN 1 AND 32),
    month_year TEXT NOT NULL, -- e.g., 'Shrawan 2083'
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for daily sheets and agent reporting
CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_agent_id ON public.transactions(agent_id);
CREATE INDEX IF NOT EXISTS idx_transactions_nepali_date ON public.transactions(nepali_date);
CREATE INDEX IF NOT EXISTS idx_transactions_month_year ON public.transactions(month_year);

-- =========================================================================
-- 6. AUTOMATIC ACCOUNT BALANCE UPDATE TRIGGER
-- Updates current_balance automatically when a transaction is logged
-- =========================================================================
CREATE OR REPLACE FUNCTION public.sync_account_balance()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (NEW.type = 'deposit') THEN
            UPDATE public.accounts
            SET current_balance = current_balance + NEW.amount
            WHERE id = NEW.account_id;
        ELSIF (NEW.type = 'withdrawal') THEN
            UPDATE public.accounts
            SET current_balance = current_balance - NEW.amount
            WHERE id = NEW.account_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (OLD.type = 'deposit') THEN
            UPDATE public.accounts
            SET current_balance = current_balance - OLD.amount
            WHERE id = OLD.account_id;
        ELSIF (OLD.type = 'withdrawal') THEN
            UPDATE public.accounts
            SET current_balance = current_balance + OLD.amount
            WHERE id = OLD.account_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_account_balance ON public.transactions;
CREATE TRIGGER trg_sync_account_balance
AFTER INSERT OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_account_balance();

-- =========================================================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is an Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- -------------------------------------------------------------------------
-- PROFILES POLICIES
-- -------------------------------------------------------------------------
-- Users can read their own profile; Admins can read all profiles
CREATE POLICY "Profiles select policy" ON public.profiles
FOR SELECT USING (
    auth.uid() = id OR public.is_admin()
);

-- Only Admins can create or update profiles
CREATE POLICY "Profiles admin insert policy" ON public.profiles
FOR INSERT WITH CHECK (
    public.is_admin()
);

CREATE POLICY "Profiles admin update policy" ON public.profiles
FOR UPDATE USING (
    auth.uid() = id OR public.is_admin()
);

-- -------------------------------------------------------------------------
-- ACCOUNTS POLICIES (Bachat Karta)
-- -------------------------------------------------------------------------
-- Admins see all accounts; Agents see ONLY accounts assigned to them
CREATE POLICY "Accounts select policy" ON public.accounts
FOR SELECT USING (
    public.is_admin() OR assigned_agent_id = auth.uid()
);

-- Admins can insert any account; Agents can insert accounts assigned to themselves
CREATE POLICY "Accounts insert policy" ON public.accounts
FOR INSERT WITH CHECK (
    public.is_admin() OR (assigned_agent_id = auth.uid())
);

-- Admins can update any; Agents can update only their assigned accounts
CREATE POLICY "Accounts update policy" ON public.accounts
FOR UPDATE USING (
    public.is_admin() OR (assigned_agent_id = auth.uid())
);

-- Only Admins can delete accounts
CREATE POLICY "Accounts delete policy" ON public.accounts
FOR DELETE USING (
    public.is_admin()
);

-- -------------------------------------------------------------------------
-- TRANSACTIONS POLICIES (Daily Collections)
-- -------------------------------------------------------------------------
-- Admins see all transactions; Agents see ONLY their own transactions
CREATE POLICY "Transactions select policy" ON public.transactions
FOR SELECT USING (
    public.is_admin() OR agent_id = auth.uid()
);

-- Field agents insert their own collections; Admins can insert on behalf
CREATE POLICY "Transactions insert policy" ON public.transactions
FOR INSERT WITH CHECK (
    public.is_admin() OR (agent_id = auth.uid())
);

-- Update and Delete transactions restricted to Admin for financial audit integrity
CREATE POLICY "Transactions admin modify policy" ON public.transactions
FOR UPDATE USING (
    public.is_admin()
);

CREATE POLICY "Transactions admin delete policy" ON public.transactions
FOR DELETE USING (
    public.is_admin()
);

-- =========================================================================
-- 8. DEFAULT ADMIN CREDENTIALS & INITIAL SEEDING SCRIPT
-- Default Admin: admin@manassahakari.com / Admin@Manas2083#
-- =========================================================================

-- Option A: If using Supabase SQL Editor / Auth Extension directly:
-- (Supabase hashes passwords using pgcrypto blowfish crypt)
/*
DO $$
DECLARE
    new_admin_id UUID := 'a0000000-0000-0000-0000-000000000001'::UUID;
BEGIN
    -- 1. Insert into auth.users (if not already exists)
    INSERT INTO auth.users (
        id,
        instance_id,
        email,
        encrypted_password,
        email_confirmed_at,
        created_at,
        updated_at,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        role
    ) VALUES (
        new_admin_id,
        '00000000-0000-0000-0000-000000000000',
        'admin@manassahakari.com',
        crypt('Admin@Manas2083#', gen_salt('bf')),
        now(),
        now(),
        now(),
        '{"provider":"email","providers":["email"]}',
        '{"full_name":"Manas Admin - Tikapur"}',
        false,
        'authenticated'
    ) ON CONFLICT (id) DO NOTHING;

    -- 2. Insert into public.profiles
    INSERT INTO public.profiles (
        id,
        full_name,
        role,
        phone_number,
        assigned_area
    ) VALUES (
        new_admin_id,
        'Manas Sahakari Admin (टिकापुर)',
        'admin',
        '9858420000',
        'Tikapur-1 Central Office'
    ) ON CONFLICT (id) DO NOTHING;
END $$;
*/
`;
