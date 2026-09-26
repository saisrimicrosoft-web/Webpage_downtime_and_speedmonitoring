-- ============================================================
-- Schema for Uptime & SSL Monitoring System (Person B)
-- Run this in the Supabase SQL Editor to create all tables.
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────── TARGETS TABLE ────────────────────────────
CREATE TABLE IF NOT EXISTS targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2048) NOT NULL,
    check_interval_seconds INTEGER DEFAULT 60,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent duplicate targets for the same URL
CREATE UNIQUE INDEX IF NOT EXISTS idx_targets_url_unique ON targets (url);

-- ──────────────────────────── CHECK RESULTS TABLE ──────────────────────
-- Time-series data: one row per check per target
CREATE TABLE IF NOT EXISTS check_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES targets(id) ON DELETE CASCADE,
    status_code INTEGER,
    response_time_ms INTEGER,
    is_up BOOLEAN NOT NULL,
    ssl_valid BOOLEAN,
    ssl_days_remaining INTEGER,
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- ──────────────────────────── INCIDENTS TABLE ──────────────────────────
-- State-tracking for the anti-spam alerting engine
CREATE TABLE IF NOT EXISTS incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    target_id UUID REFERENCES targets(id) ON DELETE CASCADE,
    incident_type VARCHAR(50) NOT NULL,       -- 'DOWNTIME', 'SSL_ISSUE'
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'RESOLVED'
    started_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    details TEXT
);

-- ──────────────────────────── INDEXES ──────────────────────────────────
-- Optimizes Next.js dashboard fetching the latest checks and time-series charts
CREATE INDEX IF NOT EXISTS idx_check_results_target_id_checked_at
    ON check_results (target_id, checked_at DESC);

-- Optimizes the anti-spam engine looking for currently open incidents
CREATE INDEX IF NOT EXISTS idx_incidents_target_status
    ON incidents (target_id, status);

-- Optimizes incident history queries by target
CREATE INDEX IF NOT EXISTS idx_incidents_target_started
    ON incidents (target_id, started_at DESC);

-- ──────────────────────────── ROW LEVEL SECURITY ──────────────────────
ALTER TABLE targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;

-- Policies for targets
DROP POLICY IF EXISTS "Users can view their own targets" ON targets;
CREATE POLICY "Users can view their own targets"
    ON targets FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage their own targets" ON targets;
CREATE POLICY "Users can manage their own targets"
    ON targets FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policies for check_results
DROP POLICY IF EXISTS "Users can view their own target check results" ON check_results;
CREATE POLICY "Users can view their own target check results"
    ON check_results FOR SELECT
    USING (target_id IN (SELECT id FROM targets WHERE user_id = auth.uid()));

-- Policies for incidents
DROP POLICY IF EXISTS "Users can view their own target incidents" ON incidents;
CREATE POLICY "Users can view their own target incidents"
    ON incidents FOR SELECT
    USING (target_id IN (SELECT id FROM targets WHERE user_id = auth.uid()));

-- NOTE: The backend Python script authenticates using the service role key
-- to bypass RLS for inserting checks and managing incidents.

-- Explicit Grants for service_role
GRANT ALL ON public.targets TO service_role;
GRANT ALL ON public.check_results TO service_role;
GRANT ALL ON public.incidents TO service_role;
