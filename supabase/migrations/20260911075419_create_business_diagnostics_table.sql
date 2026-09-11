/*
# Create business_diagnostics table (Fase 2 v2: diagnostico de negocio)

1. New Tables
- `business_diagnostics`
  - `id` (uuid, primary key)
  - `email` (text, not null) — vincula con el lead de Fase 1 (mismo email)
  - `industry` (text)
  - `ai_score` (integer) — score de Fase 1, si existe, para contexto
  - `ai_level` (text)
  - `team_size` (text)
  - `bottleneck` (text) — cuello de botella declarado (clave interna)
  - `tool_level` (text) — nivel actual de herramientas/automatizacion
  - `urgency` (text) — momento respecto a implementar IA
  - `mini_report` (jsonb) — { headline, recommendations[], closingNote }
  - `wants_contact` (boolean, default false) — el prospecto pidio explicitamente que Cupperlab lo contacte
  - `status` (text, default 'Diagnostico de negocio completado - pendiente de seguimiento comercial')
  - `source` (text, default 'AI Maturity Profile - Fase 2 (diagnostico de negocio)')
  - `created_at` (timestamptz, default now())

Este perfil de negocio (tamano de equipo, cuello de botella, nivel de
herramientas, urgencia) es justamente el insumo que alimenta la Fase 3
(venta consultiva de servicios Cupperlab): permite priorizar y personalizar
el seguimiento comercial en vez de tratarlo como un lead generico.

2. Security
- Enable RLS.
- Allow anon + authenticated INSERT (cualquiera puede enviar su diagnostico).
- Allow anon + authenticated SELECT (para que el usuario recupere su propio reporte si hace falta).
- No UPDATE ni DELETE desde el frontend (igual que `leads`).
*/

CREATE TABLE IF NOT EXISTS business_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  industry text,
  ai_score integer,
  ai_level text,
  team_size text,
  bottleneck text,
  tool_level text,
  urgency text,
  mini_report jsonb DEFAULT '{}'::jsonb,
  wants_contact boolean DEFAULT false,
  status text DEFAULT 'Diagnostico de negocio completado - pendiente de seguimiento comercial',
  source text DEFAULT 'AI Maturity Profile - Fase 2 (diagnostico de negocio)',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE business_diagnostics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_insert_business_diagnostics" ON business_diagnostics;
CREATE POLICY "anon_insert_business_diagnostics" ON business_diagnostics FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_select_business_diagnostics" ON business_diagnostics;
CREATE POLICY "anon_select_business_diagnostics" ON business_diagnostics FOR SELECT
  TO anon, authenticated USING (true);
