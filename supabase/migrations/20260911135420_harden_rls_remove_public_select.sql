-- Endurece RLS: quita SELECT publico (anon) en leads y business_diagnostics.
-- El INSERT publico se mantiene (necesario para el formulario del funnel).
-- La lectura la sigue haciendo la Edge Function admin-diagnostics via
-- SUPABASE_SERVICE_ROLE_KEY, que bypassa RLS siempre, asi que el panel
-- interno (AdminPanel -> admin-diagnostics) no se ve afectado.

DROP POLICY IF EXISTS "anon_select_leads" ON leads;
DROP POLICY IF EXISTS "anon_select_business_diagnostics" ON business_diagnostics;
