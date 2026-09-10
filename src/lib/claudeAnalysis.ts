import type { CategoryScore, Industry, ProfileContent } from '@/lib/scoring';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type ClaudeCategoryVerdict = { score: number; max: number; evidence_quote: string | null; reasoning: string };
type ClaudeFunctionResponse = {
  scores: Record<'headline' | 'about' | 'skills' | 'certifications' | 'language' | 'activity', ClaudeCategoryVerdict>;
  total: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  engine: string;
};

export type ClaudeAnalysisOutcome = {
  scores: CategoryScore;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

// Cache en memoria (dura mientras la pestana este abierta): el MISMO perfil,
// analizado dos veces en la misma sesion, jamas debe devolver un numero
// distinto solo por volver a llamar a la API. Bug real reportado: mismo
// perfil, una corrida dio 19 y otra dio 0 porque una llamada tuvo un fallo
// transitorio (timeout/red) y cayo silenciosamente al motor deterministico,
// que puntua muy distinto al de Claude. Con el cache, "analizar de nuevo" el
// mismo contenido siempre repite el mismo resultado ya validado.
const analysisCache = new Map<string, ClaudeAnalysisOutcome | null>();

function cacheKey(content: ProfileContent, industry: Industry): string {
  return JSON.stringify({ industry, content });
}

async function callAnalyzeProfile(content: ProfileContent, industry: Industry): Promise<ClaudeFunctionResponse | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-profile`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ content, industry }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ClaudeFunctionResponse;
    if (!data?.scores) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Motor de analisis "cercano a la realidad" (Claude Haiku 4.5 + verificacion
 * anti-alucinacion server-side, ver supabase/functions/analyze-profile).
 *
 * Garantiza dos cosas ademas del guardrail anti-alucinacion:
 * 1. Reintenta UNA vez ante fallo transitorio (timeout, red, 5xx) antes de
 *    rendirse — para no caer al fallback deterministico por un problema de
 *    un solo request.
 * 2. Cachea por (contenido + industria): re-analizar el mismo perfil en la
 *    misma sesion nunca vuelve a golpear la API ni puede dar un numero
 *    distinto al ya mostrado.
 *
 * Devuelve null solo si, tras el reintento, sigue sin poder completarse
 * (sin credenciales, timeout persistente, error de red, respuesta invalida),
 * para que quien llama caiga de vuelta al scoring 100% deterministico de
 * scoring.ts sin romper la experiencia del usuario.
 */
export async function analyzeProfileWithClaude(
  content: ProfileContent,
  industry: Industry
): Promise<ClaudeAnalysisOutcome | null> {
  const key = cacheKey(content, industry);
  const cached = analysisCache.get(key);
  if (cached !== undefined) return cached;

  let data = await callAnalyzeProfile(content, industry);
  if (!data) data = await callAnalyzeProfile(content, industry);

  const outcome: ClaudeAnalysisOutcome | null = data
    ? {
        scores: {
          headline: data.scores.headline?.score ?? 0,
          about: data.scores.about?.score ?? 0,
          skills: data.scores.skills?.score ?? 0,
          certifications: data.scores.certifications?.score ?? 0,
          language: data.scores.language?.score ?? 0,
          activity: data.scores.activity?.score ?? 0,
        },
        strengths: Array.isArray(data.strengths) ? data.strengths : [],
        weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
        recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
      }
    : null;

  analysisCache.set(key, outcome);
  return outcome;
}
