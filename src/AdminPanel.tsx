import { useState } from 'react';

// Panel interno (solo Cupperlab): junta el score de Fase 1 y el diagnostico
// de negocio de Fase 2 de cada prospecto en una sola vista, en vez de cruzar
// dos tablas a mano en el dashboard de Supabase. Se accede con
// https://tu-sitio.com/?admin=1 (no hay enlace visible en la app publica) y
// pide una clave que se valida del lado del servidor (Edge Function
// admin-diagnostics), nunca en el navegador.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

type Prospect = {
  id: string;
  email: string;
  name: string | null;
  industry: string | null;
  linkedin_url: string | null;
  score: number | null;
  percentile: string | null;
  level: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendations: string[] | null;
  status: string | null;
  source: string | null;
  created_at: string;
  businessDiagnostic: {
    team_size: string | null;
    bottleneck: string | null;
    tool_level: string | null;
    urgency: string | null;
    wants_contact: boolean | null;
    mini_report: { headline?: string; recommendations?: string[]; closingNote?: string } | null;
    created_at: string;
  } | null;
};

export default function AdminPanel() {
  const [adminKey, setAdminKey] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadProspects = async (key: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-diagnostics`, {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          apikey: SUPABASE_ANON_KEY,
          'x-admin-key': key,
        },
      });
      if (res.status === 401) { setError('Clave incorrecta.'); setUnlocked(false); return; }
      if (!res.ok) { setError('No se pudo cargar el panel. Revisa que la Edge Function este desplegada.'); return; }
      const data = await res.json();
      setProspects(data.prospects ?? []);
      setUnlocked(true);
    } catch {
      setError('No se pudo conectar. Revisa tu conexion.');
    } finally {
      setLoading(false);
    }
  };

  if (!unlocked) {
    return (
      <main className="admin-gate">
        <div className="admin-gate-card">
          <span className="section-label">PANEL INTERNO CUPPERLAB</span>
          <h1>Clave de acceso</h1>
          <input
            type="password"
            value={adminKey}
            onChange={(e) => setAdminKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadProspects(adminKey)}
            placeholder="Clave de administrador"
            autoFocus
          />
          <button className="button button-gold wide-button" disabled={loading || !adminKey} onClick={() => loadProspects(adminKey)}>
            {loading ? 'Verificando...' : 'Entrar'}
          </button>
          {error && <p className="analysis-error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="admin-panel">
      <div className="admin-header">
        <div>
          <span className="section-label">PANEL INTERNO CUPPERLAB</span>
          <h1>Prospectos ({prospects.length})</h1>
        </div>
        <button className="action-btn" onClick={() => loadProspects(adminKey)}>Actualizar</button>
      </div>

      <div className="admin-list">
        {prospects.map((p) => (
          <div key={p.id} className="admin-row">
            <button className="admin-row-summary" onClick={() => setExpandedId(expandedId === p.id ? null : p.id)}>
              <div className="admin-row-main">
                <strong>{p.email}</strong>
                <span>{p.industry || '—'}</span>
              </div>
              <div className="admin-row-meta">
                {p.score !== null && p.score > 0 && <span className="admin-score">{p.score}/100</span>}
                {p.businessDiagnostic?.wants_contact && <span className="admin-flag">QUIERE CONTACTO</span>}
                <span className="admin-date">{new Date(p.created_at).toLocaleDateString('es')}</span>
              </div>
            </button>

            {expandedId === p.id && (
              <div className="admin-row-detail">
                <div className="admin-detail-block">
                  <h3>Fase 1 · AI Maturity</h3>
                  <p><b>Nivel:</b> {p.level || '—'} · <b>Percentil:</b> {p.percentile || '—'}</p>
                  <p><b>Estado:</b> {p.status || '—'}</p>
                  {!!p.strengths?.length && <p><b>Fortalezas:</b> {p.strengths.join(' · ')}</p>}
                  {!!p.weaknesses?.length && <p><b>Debilidades:</b> {p.weaknesses.join(' · ')}</p>}
                  {!!p.recommendations?.length && <p><b>Recomendaciones:</b> {p.recommendations.join(' · ')}</p>}
                  {p.linkedin_url && <p><b>LinkedIn:</b> {p.linkedin_url}</p>}
                </div>

                <div className="admin-detail-block">
                  <h3>Fase 2 · Diagnostico de negocio</h3>
                  {p.businessDiagnostic ? (
                    <>
                      <p><b>Equipo:</b> {p.businessDiagnostic.team_size} · <b>Cuello de botella:</b> {p.businessDiagnostic.bottleneck} · <b>Herramientas:</b> {p.businessDiagnostic.tool_level} · <b>Momento:</b> {p.businessDiagnostic.urgency}</p>
                      {p.businessDiagnostic.wants_contact && <p className="admin-flag-inline">Pidio contacto directo de un consultor.</p>}
                      {p.businessDiagnostic.mini_report?.headline && (
                        <div className="admin-mini-report">
                          <p><b>{p.businessDiagnostic.mini_report.headline}</b></p>
                          {p.businessDiagnostic.mini_report.recommendations?.map((r, i) => <p key={i}>· {r}</p>)}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="admin-empty">Todavia no completo el diagnostico de negocio.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {prospects.length === 0 && <p className="admin-empty">Sin prospectos todavia.</p>}
      </div>
    </main>
  );
}
