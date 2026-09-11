import type { BusinessDiagnosticAnswers, MiniReport } from '@/lib/businessDiagnostic';
import {
  bottleneckOptions, buildFallbackMiniReport, teamSizeOptions, toolLevelOptions, urgencyOptions,
} from '@/lib/businessDiagnostic';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type DiagnosticFunctionResponse = { headline: string; recommendations: string[]; closingNote: string; engine: string };

function labelFor<T extends string>(options: { value: T; label: string }[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value;
}

const reportCache = new Map<string, MiniReport>();

function cacheKey(answers: BusinessDiagnosticAnswers, industry: string, aiScore: number | null): string {
  return JSON.stringify({ answers, industry, aiScore });
}

async function callBusinessDiagnostic(
  answers: BusinessDiagnosticAnswers,
  industry: string,
  aiScore: number | null,
  aiLevel: string | null
): Promise<DiagnosticFunctionResponse | null> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/business-diagnostic`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        industry,
        aiScore,
        aiLevel,
        teamSize: labelFor(teamSizeOptions, answers.teamSize),
        bottleneck: answers.bottleneck,
        bottleneckLabel: labelFor(bottleneckOptions, answers.bottleneck),
        toolLevel: answers.toolLevel,
        toolLevelLabel: labelFor(toolLevelOptions, answers.toolLevel),
        urgency: answers.urgency,
        urgencyLabel: labelFor(urgencyOptions, answers.urgency),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as DiagnosticFunctionResponse;
    if (!data?.headline || !Array.isArray(data.recommendations)) return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Genera el mini-reporte de la Fase 2 (diagnostico de negocio). Reintenta una
 * vez ante fallo transitorio, cachea por respuestas+industria+score (mismo
 * cuestionario dos veces en la misma sesion = mismo reporte), y si Claude no
 * responde tras el reintento, cae a una plantilla local por cuello de
 * botella (buildFallbackMiniReport): nunca deja al prospecto sin nada a
 * cambio de haber contestado.
 */
export async function generateMiniReport(
  answers: BusinessDiagnosticAnswers,
  industry: string,
  aiScore: number | null,
  aiLevel: string | null
): Promise<MiniReport> {
  const key = cacheKey(answers, industry, aiScore);
  const cached = reportCache.get(key);
  if (cached) return cached;

  let data = await callBusinessDiagnostic(answers, industry, aiScore, aiLevel);
  if (!data) data = await callBusinessDiagnostic(answers, industry, aiScore, aiLevel);

  const report: MiniReport = data
    ? { headline: data.headline, recommendations: data.recommendations, closingNote: data.closingNote }
    : buildFallbackMiniReport(answers.bottleneck);

  reportCache.set(key, report);
  return report;
}
