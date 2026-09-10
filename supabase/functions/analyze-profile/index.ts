// Supabase Edge Function: analyze-profile
//
// Motor de analisis "cercano a la realidad" con Claude, en lugar del scoring
// puramente por keywords de src/lib/scoring.ts. Corre en el servidor (Deno)
// para que la API key de Anthropic nunca se exponga en el navegador.
//
// Guardrail anti-alucinacion (obligatorio segun el brief, seccion 7):
// Claude debe citar, por cada categoria puntuada, una cita textual EXACTA
// tomada del contenido del perfil que se le paso. Este servidor verifica que
// esa cita realmente exista (substring, normalizado) en el texto de entrada
// antes de aceptar el puntaje. Si la cita no se puede verificar, la categoria
// se fuerza a 0 y se marca "sin evidencia verificable" — nunca se confia
// ciegamente en lo que devuelve el modelo.
//
// Deploy: supabase functions deploy analyze-profile
// Secret requerido: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...

import { corsHeaders } from '../_shared/cors.ts';

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
// Haiku 4.5 en vez de Sonnet: esta tarea es clasificar contra una rubrica fija con
// JSON de salida, no razonamiento abierto. Precio: ~3x mas barato que Sonnet
// ($1/$5 por MTok in/out vs $3/$15) para un resultado equivalente en este caso de uso.
const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

type ProfileContent = {
  name: string;
  headline: string;
  about: string;
  experience: string[];
  education: string[];
  skills: string[];
  certifications: string[];
  projects: string[];
  recentPosts: string[];
};

type CategoryVerdict = {
  score: number;
  max: number;
  evidence_quote: string | null;
  reasoning: string;
};

type ClaudeAnalysis = {
  headline: CategoryVerdict;
  about: CategoryVerdict;
  skills: CategoryVerdict;
  certifications: CategoryVerdict;
  language: CategoryVerdict;
  activity: CategoryVerdict;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

const SYSTEM_PROMPT = `Eres un evaluador estricto de perfiles profesionales de LinkedIn para el "AI Maturity Score" de Cupperlab.

REGLAS NO NEGOCIABLES:
1. Solo puedes usar el texto que se te entrega. Nunca inventes titulares, skills, certificaciones, publicaciones, actividad ni resultados que no esten literalmente en el texto.
2. Por cada categoria, si asignas mas de 0 puntos DEBES incluir "evidence_quote": una cita textual EXACTA (copiada palabra por palabra) del texto de entrada que justifique el puntaje. Si no hay evidencia textual real, evidence_quote debe ser null y el score debe ser 0.
3. No dupliques la misma evidencia entre categorias distintas para inflar el puntaje.
4. No trates una palabra aislada o generica como prueba de experiencia real.
5. Si una seccion (ej. actividad/posts) no viene en el texto, score = 0 en esa categoria y dilo en el reasoning — NUNCA asumas que "no hay evidencia" significa "no usa IA".
6. Se conservador ante la duda: entre dos interpretaciones razonables, elige la mas baja.

RUBRICA (igual a la de Cupperlab, maximos por categoria):
- headline (max 12): especializacion de IA en el titular profesional.
- about (max 18): aplicaciones de IA, casos concretos, resultados medibles en la seccion About/Resumen.
- skills (max 15): skills de IA declaradas (Machine Learning, Generative AI, LLMs, Prompt Engineering, etc).
- certifications (max 15): certificaciones de IA, relevancia e institucion emisora.
- language (max 20): sofisticacion del lenguaje — automatizacion, integracion en workflows, sistemas predictivos, gobernanza/riesgos, impacto medible.
- activity (max 20): publicaciones verificables sobre IA en los ultimos 12 meses (frecuencia, profundidad, engagement).

Responde EXCLUSIVAMENTE con un JSON valido, sin texto adicional, con esta forma exacta:
{
  "headline": {"score": number, "max": 12, "evidence_quote": string|null, "reasoning": string},
  "about": {"score": number, "max": 18, "evidence_quote": string|null, "reasoning": string},
  "skills": {"score": number, "max": 15, "evidence_quote": string|null, "reasoning": string},
  "certifications": {"score": number, "max": 15, "evidence_quote": string|null, "reasoning": string},
  "language": {"score": number, "max": 20, "evidence_quote": string|null, "reasoning": string},
  "activity": {"score": number, "max": 20, "evidence_quote": string|null, "reasoning": string},
  "strengths": [string, string],
  "weaknesses": [string, string],
  "recommendations": [string, string, string]
}`;

// Normaliza para comparar evidencia: minusculas, colapsa espacios Y trata comas/
// pipes/saltos de linea como separadores equivalentes. Sin esto, una cita real
// como "Machine Learning, Generative AI" se rechazaba como "alucinacion" solo
// porque el texto fuente las separa con salto de linea en vez de coma (bug
// encontrado en QA manual, corregido antes de dar la funcion por lista).
function normalize(text: string): string {
  return text.toLowerCase().replace(/[,;|\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

// Guardrail: rechaza cualquier categoria cuya evidencia citada no exista
// literalmente en el texto que el usuario proporciono.
function verifyAndClamp(verdict: CategoryVerdict, sourceText: string, max: number): CategoryVerdict {
  const score = Math.max(0, Math.min(Math.round(verdict.score ?? 0), max));
  if (score === 0) return { ...verdict, score: 0, max };
  const quote = (verdict.evidence_quote || '').trim();
  if (!quote || !normalize(sourceText).includes(normalize(quote))) {
    return {
      score: 0,
      max,
      evidence_quote: null,
      reasoning: 'Descartado: el modelo no aporto una cita verificable en el texto original (posible alucinacion).',
    };
  }
  return { ...verdict, score, max };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (!ANTHROPIC_API_KEY) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY no configurada en los secretos de la funcion.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { content, industry } = (await req.json()) as { content: ProfileContent; industry: string };

    const sourceText = [
      content.headline, content.about,
      ...(content.skills || []), ...(content.certifications || []),
      ...(content.experience || []), ...(content.projects || []),
      ...(content.recentPosts || []),
    ].join('\n');

    const userMessage = `Industria declarada: ${industry}

PERFIL A EVALUAR (texto literal proporcionado por el usuario):
---
Headline: ${content.headline || '(vacio)'}
About: ${content.about || '(vacio)'}
Skills: ${(content.skills || []).join(', ') || '(vacio)'}
Certificaciones: ${(content.certifications || []).join(', ') || '(vacio)'}
Experiencia: ${(content.experience || []).join(' | ') || '(vacio)'}
Proyectos: ${(content.projects || []).join(' | ') || '(vacio)'}
Publicaciones recientes: ${(content.recentPosts || []).join(' | ') || '(vacio)'}
---`;

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1500,
        temperature: 0,
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

    let parsed: ClaudeAnalysis;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
    } catch {
      return new Response(JSON.stringify({ error: 'Claude no devolvio JSON valido', raw: rawText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const verified = {
      headline: verifyAndClamp(parsed.headline, sourceText, 12),
      about: verifyAndClamp(parsed.about, sourceText, 18),
      skills: verifyAndClamp(parsed.skills, sourceText, 15),
      certifications: verifyAndClamp(parsed.certifications, sourceText, 15),
      language: verifyAndClamp(parsed.language, sourceText, 20),
      activity: verifyAndClamp(parsed.activity, sourceText, 20),
    };

    const total = Object.values(verified).reduce((sum, v) => sum + v.score, 0);

    return new Response(
      JSON.stringify({
        scores: verified,
        total,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 4) : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 4) : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 3) : [],
        engine: 'claude-haiku-4.5+verified',
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
