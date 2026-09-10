/*
# Create leads table for AI Maturity Profile

1. New Tables
- `leads`
  - `id` (uuid, primary key)
  - `email` (text, not null) — the lead's email
  - `name` (text) — the lead's name
  - `industry` (text) — selected industry
  - `linkedin_url` (text) — LinkedIn profile URL
  - `score` (integer) — AI Maturity Score 0-100
  - `percentile` (text) — estimated percentile label
  - `level` (text) — maturity level (Inicial, En desarrollo, etc.)
  - `strengths` (jsonb) — array of strength strings
  - `weaknesses` (jsonb) — array of weakness strings
  - `recommendations` (jsonb) — array of recommendation strings
  - `status` (text, default 'Lead capturado - pendiente de nurturing')
  - `source` (text, default 'AI Maturity Profile')
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `leads`.
- Allow anon + authenticated INSERT (anyone can submit a lead).
- Allow anon + authenticated SELECT (so users can retrieve their own report by email).
- No UPDATE or DELETE from the frontend.
*/

CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  name text,
  industry text,
  linkedin_url text,
  score integer,
  percentile text,
  level text,
  strengths jsonb DEFAULT '[]'::jsonb,
  weaknesses jsonb DEFAULT '[]'::jsonb,
  recommendations jsonb DEFAULT '[]'::jsonb,
  status text DEFAULT 'Lead capturado - pendiente de nurturing',
  source text DEFAULT 'AI Maturity Profile',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_leads" ON leads;
CREATE POLICY "anon_insert_leads" ON leads FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_leads" ON leads;
CREATE POLICY "anon_select_leads" ON leads FOR SELECT
  TO anon, authenticated USING (true);
