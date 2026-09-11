// Supabase Edge Function: admin-diagnostics
//
// Panel interno (solo para Juan/Cupperlab): junta leads + business_diagnostics
// por email y los devuelve ordenados por fecha, para ver el perfil COMPLETO
// de un prospecto (score de Fase 1 + diagnostico de negocio de Fase 2) en un
// solo lugar, en vez de cruzar dos tablas a mano en el dashboard de Supabase.
//
// Por que una Edge Function y no consultar directo desde el navegador con la
// anon key: las policies actuales de RLS en `leads` y `business_diagnostics`
// permiten SELECT publico (para que el flujo de Fase 1/2 funcione sin login),
// lo que significa que la anon key (publica, esta en el bundle del navegador)
// ya podia leer todas las filas de todo el mundo. Esta funcion NO empeora eso
// (las tablas siguen igual), pero es importante que lo sepas: si mas adelante
// quieres que esos datos de leads NO sean legibles publicamente con la anon
// key, hay que endurecer esas policies por separado (te lo señalo aparte, no
// lo cambio yo solo porque afectaria el flujo actual de la app).
//
// Esta funcion SI usa la Service Role Key (nunca expuesta al navegador) y
// exige un header `x-admin-key` que coincida con el secreto ADMIN_SECRET,
// para que solo quien tenga esa clave pueda ver el listado combinado.
//
// Deploy: supabase functions deploy admin-diagnostics
// Secrets requeridos:
//   supabase secrets set ADMIN_SECRET=tu-clave-elegida
//   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=... (Project Settings > API > service_role)

import { corsHeaders } from '../_shared/cors.ts';

const ADMIN_SECRET = Deno.env.get('ADMIN_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!ADMIN_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return new Response(JSON.stringify({ error: 'Panel interno no configurado: faltan secretos (ADMIN_SECRET / SUPABASE_SERVICE_ROLE_KEY).' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const providedKey = req.headers.get('x-admin-key');
  if (providedKey !== ADMIN_SECRET) {
    return new Response(JSON.stringify({ error: 'Clave invalida' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const restHeaders = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    };

    const [leadsRes, diagnosticsRes] = await Promise.all([
      fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc&limit=500`, { headers: restHeaders }),
      fetch(`${SUPABASE_URL}/rest/v1/business_diagnostics?select=*&order=created_at.desc&limit=500`, { headers: restHeaders }),
    ]);

    if (!leadsRes.ok) {
      return new Response(JSON.stringify({ error: 'No se pudo leer leads', detail: await leadsRes.text() }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const leads = await leadsRes.json();
    // business_diagnostics puede no existir todavia si la migracion no se ha
    // corrido: en ese caso seguimos devolviendo los leads solos, en vez de
    // fallar todo el panel.
    const diagnostics = diagnosticsRes.ok ? await diagnosticsRes.json() : [];

    // Junta por email: cada prospecto puede tener 0 o 1 diagnostico de negocio
    // (nos quedamos con el mas reciente si hay varios).
    type DiagRow = { email: string; created_at: string } & Record<string, unknown>;
    const diagByEmail = new Map<string, DiagRow>();
    for (const d of diagnostics as DiagRow[]) {
      const existing = diagByEmail.get(d.email);
      if (!existing || new Date(d.created_at) > new Date(existing.created_at)) diagByEmail.set(d.email, d);
    }

    type LeadRow = { email: string } & Record<string, unknown>;
    const combined = (leads as LeadRow[]).map((lead) => ({
      ...lead,
      businessDiagnostic: diagByEmail.get(lead.email) ?? null,
    }));

    return new Response(JSON.stringify({ prospects: combined }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
