// Supabase Edge Function: business-diagnostic
//
// Fase 2 (v2) del funnel: genera un mini-reporte personalizado sobre COMO
// aplicar IA al problema de negocio que el prospecto acaba de declarar
// (cuello de botella, tamano de equipo, herramientas actuales, urgencia).
//
// A diferencia de analyze-profile (que puntua evidencia textual de un
// perfil), esta funcion no evalua ni puntua nada: da orientacion generica
// pero especifica al caso declarado. Por eso NO necesita el guardrail de
// "evidence_quote" verificado — el riesgo aqui no es que el modelo invente
// datos DEL PROSPECTO (no le pedimos que cite nada suyo), sino que invente
// cifras o garantias como si fueran hechos. Eso se controla en el prompt:
// nada de porcentajes, plazos o resultados inventados, solo recomendaciones
// de accion.
//
// Deploy: supabase functions deploy business-diagnostic
// Secret requerido: supabase secrets set ANTHROPIC_API_KEY=sk-ant-... (el mismo que analyze-profile)

import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

type DiagnosticInput = {
  industry: string;
  aiScore: number | null;
  aiLevel: string | null;
  teamSize: string;
  bottleneck: string;
  bottleneckLabel: string;
  toolLevel: string;
  toolLevelLabel: string;
  urgency: string;
  urgencyLabel: string;
};

const SYSTEM_PROMPT = `Eres un consultor senior de Cupperlab (agencia de automatizacion e IA) dando una primera orientacion GRATUITA y honesta a un empresario, a partir de un mini-cuestionario que acaba de responder.

REGLAS NO NEGOCIABLES:
1. No inventes cifras, porcentajes de mejora, plazos de implementacion ni resultados garantizados. No conoces los numeros reales de este negocio.
2. No inventes datos sobre la empresa que no se te dieron (nombre, clientes, ingresos, etc.).
3. Las recomendaciones deben ser accionables y especificas al cuello de botella y al nivel de herramientas que declaro (no genericas tipo "usa mas IA").
4. Si ya tiene automatizaciones o sistemas propios, no le recomiendes lo basico que ya hace; sube el nivel de la recomendacion.
5. Si no tiene nada todavia, no le recomiendes algo que requiere un equipo tecnico dedicado: empieza simple.
6. Tono: directo, profesional, sin venta agresiva. Esto es valor real, no un discurso de ventas.
7. Nunca prometas resultados de Cupperlab ni asumas que va a contratar nada.

Responde EXCLUSIVAMENTE con un JSON valido, sin texto adicional, con esta forma exacta:
{
  "headline": "una frase que valide el problema declarado y ubique donde esta parado, sin cifras inventadas",
  "recommendations": ["accion concreta 1", "accion concreta 2", "accion concreta 3"],
  "closingNote": "una frase honesta de cierre, sin presion de venta"
}`;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en los secretos de la funcion.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const input = (await req.json()) as DiagnosticInput;

    const userMessage = `Industria declarada: ${input.industry}
Score AI Maturity (Fase 1, si existe): ${input.aiScore ?? 'no disponible'} — nivel: ${input.aiLevel ?? 'no disponible'}

Respuestas del mini-cuestionario:
- Tamano de equipo: ${input.teamSize}
- Mayor cuello de botella: ${input.bottleneckLabel}
- Herramientas de IA/automatizacion actuales: ${input.toolLevelLabel}
- Momento respecto a implementar IA: ${input.urgencyLabel}

Da la orientacion inicial segun las reglas del sistema.`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 700,
        temperature: 0.3,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return new Response(JSON.stringify({ error: 'Fallo la llamada a Claude', detail: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const anthropicJson = await anthropicRes.json();
    const rawText: string = anthropicJson?.content?.[0]?.text ?? '';

    let parsed: { headline: string; recommendations: string[]; closingNote: string };
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      return new Response(JSON.stringify({ error: 'Claude no devolvio JSON valido', raw: rawText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!parsed.headline || !Array.isArray(parsed.recommendations) || !parsed.closingNote) {
      return new Response(JSON.stringify({ error: 'Respuesta incompleta de Claude', raw: parsed }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({
        headline: parsed.headline,
        recommendations: parsed.recommendations.slice(0, 4),
        closingNote: parsed.closingNote,
        engine: 'claude-haiku-4.5',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Error interno', detail: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
