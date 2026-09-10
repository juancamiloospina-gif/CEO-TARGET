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

/**
 * Motor de analisis "cercano a la realidad" (Claude Haiku 4.5 + verificacion
 * anti-alucinacion server-side, ver supabase/functions/analyze-profile).
 * Devuelve null ante CUALQUIER problema (sin credenciales, timeout, error de
 * red, respuesta invalida) para que quien llama pueda caer de vuelta al
 * scoring 100% deterministico de scoring.ts sin romper la experiencia del
 * usuario.
 */
export async function analyzeProfileWithClaude(
  content: ProfileContent,
  industry: Industry
): Promise<ClaudeAnalysisOutcome | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

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
    clearTimeout(timeoutId);

    if (!res.ok) return null;
    const data = (await res.json()) as ClaudeFunctionResponse;
    if (!data?.scores) return null;

    const scores: CategoryScore = {
      headline: data.scores.headline?.score ?? 0,
      about: data.scores.about?.score ?? 0,
      skills: data.scores.skills?.score ?? 0,
      certifications: data.scores.certifications?.score ?? 0,
      language: data.scores.language?.score ?? 0,
      activity: data.scores.activity?.score ?? 0,
    };

    return {
      scores,
      strengths: Array.isArray(data.strengths) ? data.strengths : [],
      weaknesses: Array.isArray(data.weaknesses) ? data.weaknesses : [],
      recommendations: Array.isArray(data.recommendations) ? data.recommendations : [],
    };
  } catch {
    return null;
  }
}
