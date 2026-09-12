import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ArrowRight, Check, CheckCircle2, ChevronRight,
  Copy, Download, FileText, Globe2, Info, Link2, Lock, Mail, Menu,
  Radar, ScanLine, Sparkles, Upload, UserRound, X, Zap,
} from 'lucide-react';
import { analyzeProfile, buildResult, type Industry, type ProfileContent, type ScoreResult } from '@/lib/scoring';
import { analyzeProfileWithClaude } from '@/lib/claudeAnalysis';
import { demoProfiles } from '@/lib/demoProfiles';
import { supabase } from '@/lib/supabase';
import { extractPdfText } from '@/lib/pdf';
import {
  type Bottleneck, type BusinessDiagnosticAnswers, type DecisionRole, type MiniReport, type PainIntensity, type TeamSize,
  bottleneckOptions, buildFallbackMiniReport, decisionRoleOptions, painIntensityOptions, teamSizeOptions,
} from '@/lib/businessDiagnostic';
import { generateMiniReport } from '@/lib/claudeBusinessAnalysis';
import { buildLinkedInPostText, downloadCanvasAsPng, renderShareCard } from '@/lib/shareCard';

type Stage = 'landing' | 'analyzing' | 'results' | 'diagnostic' | 'mini-report';
type FormData = { linkedinUrl: string; pastedContent: string; pdfFile: File | null; email: string; industry: Industry; demoId: string | null };

const industries: Industry[] = ['Retail', 'Tecnología', 'Finanzas', 'Consultoría', 'Salud', 'Educación', 'Manufactura', 'Product Management', 'Otro'];

const scanMessages = [
  'Analizando titular profesional...',
  'Revisando seccion About...',
  'Evaluando skills y certificaciones...',
  'Midiendo sofisticacion del lenguaje...',
  'Comparando con benchmark de tu industria...',
];

// Quita acentos/diacriticos para comparar cabeceras de seccion sin fallar en
// "Educacion" vs "Educación", etc. (bug real: LinkedIn en espanol usa tildes
// en casi todas sus cabeceras y el matching sin normalizar las perdia todas).
function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function parsePastedContent(raw: string): ProfileContent {
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  let headline = '';
  let about = '';
  const skills: string[] = [];
  const certifications: string[] = [];
  const experience: string[] = [];
  const education: string[] = [];
  const recentPosts: string[] = [];
  const projects: string[] = [];
  let currentSection = '';
  let name = '';

  for (const line of lines) {
    const l = stripAccents(line.toLowerCase());
    // Una linea solo cuenta como POSIBLE cabecera de seccion si es corta y no
    // termina como una frase de parrafo. Sin esto, una frase normal como
    // "...datos para publicaciones academicas..." disparaba por error la
    // seccion de "Actividad reciente" solo por contener la palabra
    // "publicaciones" (bug real encontrado probando con un PDF real).
    const looksLikeHeader = line.length <= 40 && !/[.,;:]$/.test(line);

    if (looksLikeHeader && (l.startsWith('nombre') || l.startsWith('name'))) { name = line.split(/[:—-]/).slice(1).join('').trim() || line; currentSection = ''; continue; }
    if (looksLikeHeader && (l.startsWith('titular') || l.startsWith('headline'))) { headline = line.split(/[:—-]/).slice(1).join('').trim() || line; currentSection = ''; continue; }
    if (looksLikeHeader && (l.startsWith('acerca de') || l.startsWith('about') || l.startsWith('resumen') || l.startsWith('summary') || l.startsWith('extracto'))) { currentSection = 'about'; continue; }
    if (looksLikeHeader && (l === 'experiencia' || l.startsWith('experience'))) { currentSection = 'experience'; continue; }
    if (looksLikeHeader && (l.startsWith('educacion') || l.startsWith('education'))) { currentSection = 'education'; continue; }
    if (looksLikeHeader && (l.startsWith('habilidades') || l.startsWith('skills') || l.startsWith('aptitudes'))) { currentSection = 'skills'; continue; }
    if (looksLikeHeader && (l.startsWith('certificacion') || l.startsWith('certification') || l.startsWith('licencias'))) { currentSection = 'certifications'; continue; }
    if (looksLikeHeader && (l.startsWith('proyectos') || l.startsWith('projects'))) { currentSection = 'projects'; continue; }
    if (looksLikeHeader && (l.startsWith('publicacion') || l.startsWith('posts') || l.startsWith('activity') || l.startsWith('actividad'))) { currentSection = 'posts'; continue; }
    // Idiomas y datos de contacto no aportan senal de IA: se descartan en vez
    // de colar como skills/certificaciones falsas.
    if (looksLikeHeader && (l.startsWith('languages') || l.startsWith('idiomas'))) { currentSection = 'ignore'; continue; }
    if (looksLikeHeader && (l.startsWith('contactar') || l.startsWith('contact'))) { currentSection = 'ignore'; continue; }
    // Heuristica: un titular estilo LinkedIn suele venir en clausulas
    // separadas por " | " (ej. "Head of Growth | +40% CRO | Automatizacion").
    // Se aplica sin importar la seccion activa, porque en un PDF real el
    // nombre+titular aparecen despues de la barra lateral (skills/certs) sin
    // ninguna cabecera propia que resetee la seccion.
    if (!headline && / \| /.test(line) && line.length < 220) { headline = line; currentSection = ''; continue; }
    if (currentSection === 'about') about += (about ? '\n' : '') + line;
    else if (currentSection === 'experience') experience.push(line);
    else if (currentSection === 'education') education.push(line);
    else if (currentSection === 'skills') skills.push(...line.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    else if (currentSection === 'certifications') certifications.push(line);
    else if (currentSection === 'projects') projects.push(line);
    else if (currentSection === 'posts') recentPosts.push(line);
    else if (currentSection === 'ignore') { /* descartado a proposito */ }
    else if (!headline && !name && line.length < 120) headline = line;
  }

  return {
    name: name || '',
    headline,
    about,
    currentRole: headline.split('|')[0]?.trim() || '',
    experience, education, skills, certifications, projects, recentPosts,
    aiRelatedTerms: [], quantifiableResults: [],
  };
}

function App() {
  const [stage, setStage] = useState<Stage>('landing');
  const [form, setForm] = useState<FormData>({ linkedinUrl: '', pastedContent: '', pdfFile: null, email: '', industry: 'Tecnología', demoId: null });
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [profileContent, setProfileContent] = useState<ProfileContent | null>(null);
  const [leadSaved, setLeadSaved] = useState(false);
  const [diagnosticAnswers, setDiagnosticAnswers] = useState<BusinessDiagnosticAnswers>({ teamSize: '2-10', bottleneck: 'ventas', decisionRole: 'decido_yo', painIntensity: 'moderado' });
  const [wantsContact, setWantsContact] = useState(false);
  const [miniReport, setMiniReport] = useState<MiniReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [diagnosticSaved, setDiagnosticSaved] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [analysisReady, setAnalysisReady] = useState(false);
  // Modo prueba: SOLO existe en `npm run dev` (import.meta.env.DEV es false
  // en el build de produccion, asi que este toggle desaparece solo al
  // publicar). Permite ver todo el flujo (Fase 1 y Fase 2) sin llamar a
  // Claude ni gastar creditos, y sin escribir filas de prueba en Supabase.
  const [isTestMode, setIsTestMode] = useState(false);

  const reset = () => { setStage('landing'); setResult(null); setProfileContent(null); setLeadSaved(false); setMiniReport(null); setWantsContact(false); setDiagnosticSaved(false); setAnalysisError(null); setIsSubmitting(false); setAnalysisReady(false); setForm({ linkedinUrl: '', pastedContent: '', pdfFile: null, email: '', industry: 'Tecnología', demoId: null }); };

  const handleAnalyze = async () => {
    setAnalysisError(null);
    let content: ProfileContent;
    let industry = form.industry;

    if (form.demoId) {
      const demo = demoProfiles.find((d) => d.id === form.demoId);
      if (!demo) return;
      content = demo.content;
      industry = demo.industry;
    } else {
      let combinedText = form.pastedContent.trim();

      if (form.pdfFile) {
        try {
          const extracted = await extractPdfText(form.pdfFile);
          if (extracted.isEmpty) {
            setAnalysisError('El PDF que subiste esta vacio o no pudimos leer su texto (puede ser una imagen escaneada). Pega el contenido de tu perfil manualmente o prueba con otro archivo.');
            return;
          }
          combinedText = combinedText ? `${combinedText}\n${extracted.text}` : extracted.text;
        } catch {
          setAnalysisError('No pudimos procesar el PDF. Verifica que sea un PDF de texto exportado desde LinkedIn (no una imagen escaneada) o pega el contenido manualmente.');
          return;
        }
      }

      if (!combinedText.trim()) {
        setAnalysisError('No podemos leer tu perfil de LinkedIn solo con la URL: LinkedIn bloquea el acceso automatico a perfiles. Pega el contenido de tu perfil o sube el PDF exportado desde LinkedIn para continuar.');
        return;
      }

      content = parsePastedContent(combinedText);
      const hasSignal = Boolean(
        content.headline || content.about || content.skills.length ||
        content.certifications.length || content.experience.length || content.recentPosts.length
      );
      if (!hasSignal) {
        setAnalysisError('No pudimos identificar informacion util en el texto proporcionado. Incluye al menos tu titular (headline) y tu seccion About.');
        return;
      }
    }

    setProfileContent(content);
    setResult(null);
    setAnalysisReady(false);
    // Pasamos a la pantalla de diagnostico DE INMEDIATO (antes de esperar la
    // respuesta de Claude). El unico costo real de un cliente durante una
    // demo es sentir que el clic "no hizo nada": la llamada a la IA (que
    // puede tardar varios segundos) ahora ocurre DENTRO de la pantalla de
    // "Analizando", nunca antes de mostrarla.
    setStage('analyzing');
    try {
      // Perfiles de demo y modo prueba nunca llaman a Claude: son solo para
      // ver la interfaz funcionando, no para validar el score real.
      const claudeOutcome = (form.demoId || isTestMode) ? null : await analyzeProfileWithClaude(content, industry);
      const score = claudeOutcome
        ? buildResult(claudeOutcome.scores, content, industry, {
            strengths: claudeOutcome.strengths,
            weaknesses: claudeOutcome.weaknesses,
            recommendations: claudeOutcome.recommendations,
          })
        : analyzeProfile(content, industry);
      setResult(score);
    } catch (err) {
      // Bug real: sin este catch, cualquier fallo aqui (p.ej. un error
      // inesperado del motor deterministico local) dejaba `result` en null
      // y la promesa de handleAnalyze rechazada sin manejar. La pantalla de
      // Analizando SI reaccionaba bien (volvia a landing con error), pero
      // el rechazo sin capturar quedaba en consola como ruido. Lo dejamos
      // explicito y logueado para poder diagnosticar futuros casos reales.
      // eslint-disable-next-line no-console
      console.error('[handleAnalyze] Fallo inesperado analizando el perfil:', err);
      setResult(null);
    } finally {
      setIsSubmitting(false);
      setAnalysisReady(true);
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="brand" onClick={reset} aria-label="Inicio">
          <span className="brand-mark"><Radar size={17} /></span>
          <span>CUPPER<span>LAB</span></span>
        </button>
        <nav className={mobileMenu ? 'nav-links is-open' : 'nav-links'}>
          <button onClick={reset}>AI Maturity</button>
          <button onClick={() => result && setStage('results')}>Mi informe</button>
        </nav>
        <div className="top-actions">
          <span className="secure-note"><span className="status-dot" /> Entorno privado</span>
          <button className="menu-button" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Menu">{mobileMenu ? <X size={20} /> : <Menu size={20} />}</button>
        </div>
      </header>

      {stage === 'landing' && <Landing form={form} setForm={setForm} onAnalyze={handleAnalyze} analysisError={analysisError} onDismissError={() => setAnalysisError(null)} isSubmitting={isSubmitting} isTestMode={isTestMode} setIsTestMode={setIsTestMode} />}
      {stage === 'analyzing' && <Analyzing ready={analysisReady} onComplete={() => { if (result) { if (!form.demoId && !isTestMode) saveLead(form, result, profileContent, setLeadSaved); setStage('results'); } else { setAnalysisError('No pudimos completar tu analisis. Intenta de nuevo.'); setStage('landing'); } }} />}
      {stage === 'results' && result && <Results result={result} content={profileContent} form={form} leadSaved={leadSaved} isTestMode={isTestMode} onStartDiagnostic={() => setStage('diagnostic')} onReset={reset} />}
      {stage === 'diagnostic' && (
        <BusinessDiagnosticForm
          answers={diagnosticAnswers}
          setAnswers={setDiagnosticAnswers}
          wantsContact={wantsContact}
          setWantsContact={setWantsContact}
          isGenerating={isGeneratingReport}
          onBack={() => setStage('results')}
          onSubmit={async () => {
            setIsGeneratingReport(true);
            try {
              const report = (form.demoId || isTestMode)
                ? buildFallbackMiniReport(diagnosticAnswers.bottleneck)
                : await generateMiniReport(diagnosticAnswers, form.industry, result?.total ?? null, result?.level ?? null);
              setMiniReport(report);
              if (!form.demoId && !isTestMode) {
                await saveBusinessDiagnostic(form, diagnosticAnswers, result, report, wantsContact, setDiagnosticSaved);
              } else {
                setDiagnosticSaved(true);
              }
              setStage('mini-report');
            } finally {
              setIsGeneratingReport(false);
            }
          }}
        />
      )}
      {stage === 'mini-report' && miniReport && (
        <MiniReportView report={miniReport} wantsContact={wantsContact} diagnosticSaved={diagnosticSaved} isTestMode={isTestMode} onReset={reset} />
      )}

      <footer className="footer">
        <span>© 2024 Cupperlab AI Funnel</span>
        <span>Este diagnostico evalua la forma en que el perfil comunica publicamente sus capacidades de IA. No certifica el nivel tecnico real de la persona.</span>
        <span>
          <a className="privacy-link" href="mailto:juancamilo@cupperlab.com?subject=Solicitud%20de%20eliminacion%20de%20datos%20(GDPR)&body=Hola%2C%20quiero%20solicitar%20la%20eliminacion%20de%20mis%20datos%20personales%20almacenados%20en%20AI%20Maturity%20Profile.%20Mi%20email%20registrado%20es%3A%20">Solicitar eliminacion de mis datos (GDPR)</a>
          {' · '}
          <a className="privacy-link" href="mailto:juancamilo@cupperlab.com?subject=Quiero%20informacion%20sobre%20los%20cursos%20de%20IA%20de%20Cupperlab&body=Hola%2C%20quiero%20mas%20informacion%20sobre%20el%20catalogo%20de%20cursos%20de%20IA%20de%20Cupperlab.">Cursos de IA por area</a>
        </span>
      </footer>
    </div>
  );
}

async function saveLead(form: FormData, result: ScoreResult, content: ProfileContent | null, setLeadSaved: (v: boolean) => void) {
  if (!supabase) { setLeadSaved(false); return; }
  try {
    await supabase.from('leads').insert({
      email: form.email,
      name: content?.name || '',
      industry: form.industry,
      linkedin_url: form.linkedinUrl,
      score: result.total,
      percentile: result.percentile,
      level: result.level,
      strengths: result.strengths,
      weaknesses: result.weaknesses,
      recommendations: result.recommendations,
      status: 'Lead capturado - pendiente de nurturing',
      source: 'AI Maturity Profile',
    });
    setLeadSaved(true);
  } catch { setLeadSaved(false); }
}

// Fase 2 (v3): guarda el diagnostico de negocio (cuello de botella, tamano
// de equipo, quien decide, y que tan doloroso es el problema hoy) junto con
// el mini-reporte generado. Este es el "perfil de calificacion" que
// alimenta la Fase 3 (consultoria, no cursos): sin esto, cada conversacion
// de venta empieza de cero; con esto, Cupperlab sabe de antemano si vale la
// pena agendar la llamada, y con quien.
// Requiere la tabla `business_diagnostics` (ver supabase/migrations) — si
// todavia no existe, el insert falla en silencio y el prospecto igual ve su
// mini-reporte (nunca se le bloquea el valor por un problema nuestro de
// infraestructura).
async function saveBusinessDiagnostic(
  form: FormData,
  answers: BusinessDiagnosticAnswers,
  result: ScoreResult | null,
  report: MiniReport,
  wantsContact: boolean,
  setDiagnosticSaved: (v: boolean) => void
) {
  if (!supabase) { setDiagnosticSaved(false); return; }
  try {
    await supabase.from('business_diagnostics').insert({
      email: form.email,
      industry: form.industry,
      ai_score: result?.total ?? null,
      ai_level: result?.level ?? null,
      team_size: answers.teamSize,
      bottleneck: answers.bottleneck,
      decision_role: answers.decisionRole,
      pain_intensity: answers.painIntensity,
      mini_report: report,
      wants_contact: wantsContact,
      status: wantsContact
        ? 'Diagnostico de negocio completado - pidio contacto directo de Cupperlab'
        : 'Diagnostico de negocio completado - pendiente de seguimiento comercial',
    });
    setDiagnosticSaved(true);
  } catch { setDiagnosticSaved(false); }
}

function Landing({ form, setForm, onAnalyze, analysisError, onDismissError, isSubmitting, isTestMode, setIsTestMode }: { form: FormData; setForm: (f: FormData) => void; onAnalyze: () => void; analysisError: string | null; onDismissError: () => void; isSubmitting: boolean; isTestMode: boolean; setIsTestMode: (v: boolean) => void }) {
  const [visitorCount] = useState(() => 1247 + Math.floor(Math.random() * 300));
  const [showDemo, setShowDemo] = useState(false);
  const canAnalyze = form.demoId ? true : (form.linkedinUrl.trim().length > 0 || form.pastedContent.trim().length > 0 || !!form.pdfFile) && form.email.trim().length > 0;
  const needsEmail = !form.demoId && !form.email.trim();

  return (
    <main className="landing page-wrap">
      <div className="eyebrow"><span className="eyebrow-line" /> AI MATURITY PROFILE <span className="eyebrow-line" /></div>
      <div className="hero-grid">
        <section className="hero-copy">
          <div className="hero-kicker"><Sparkles size={15} /> CUPPERLAB AI FUNNEL <span>2 MIN</span></div>
          <h1>¿En que posicion estas frente a los empresarios de tu <em>industria</em> en la era de la IA?</h1>
          <p className="hero-subtitle">Analizamos como comunicas publicamente tus capacidades de inteligencia artificial y te mostramos tu posicion estimada frente al promedio de tu sector. En 2 minutos.</p>
          <div className="social-proof"><UserRound size={14} /> Unete a los <strong>{visitorCount.toLocaleString('es')}</strong> profesionales que ya han medido su AI Maturity Score este mes.</div>
        </section>
        <section className="hero-visual">
          <div className="orb orb-back" /><div className="orb orb-front" />
          <div className="visual-card card-top"><span>AI MATURITY SCORE</span><strong>72<small>/100</small></strong><small>Avanzado · Top 15%</small><div className="mini-bars"><i /><i /><i /><i /><i /><i /><i /></div></div>
          <div className="visual-card card-bottom"><div className="mini-icon"><Zap size={16} /></div><div><span>POSICION ESTIMADA</span><strong>Top 15% del sector</strong></div><ArrowRight size={15} /></div>
        </section>
      </div>

      <div className="form-section">
        <div className="form-card">
          <div className="form-header"><span className="section-label">ANALISIS DE PERFIL</span><h2>Tu AI Maturity Score en 2 minutos</h2></div>

          {import.meta.env.DEV && (
            <label className="test-mode-toggle">
              <input type="checkbox" checked={isTestMode} onChange={(e) => setIsTestMode(e.target.checked)} />
              <span>Modo prueba (no llama a Claude, no gasta creditos, no guarda nada)</span>
            </label>
          )}

          <div className="demo-bar">
            <button className={showDemo ? 'demo-toggle active' : 'demo-toggle'} onClick={() => setShowDemo(!showDemo)}>
              <Sparkles size={14} /> Probar con perfiles de demostracion
            </button>
            {showDemo && (
              <div className="demo-options">
                {demoProfiles.map((demo) => (
                  <button key={demo.id} className={form.demoId === demo.id ? 'demo-option selected' : 'demo-option'} onClick={() => setForm({ ...form, demoId: form.demoId === demo.id ? null : demo.id, email: form.demoId === demo.id ? '' : 'demo@cupperlab.com' })}>
                    <Check size={14} /> <b>{demo.label}</b> <span>{demo.description}</span>
                  </button>
                ))}
                {form.demoId && <div className="demo-notice"><Info size={13} /> Este es un perfil de demostracion. Los datos mostrados son ficticios y sirven para ilustrar el funcionamiento de la herramienta.</div>}
              </div>
            )}
          </div>

          {!form.demoId && (
            <>
              <div className="input-group">
                <label><span><Link2 size={14} /> URL de LinkedIn</span><input type="url" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="linkedin.com/in/tu-nombre" /></label>
                <p className="input-hint"><Info size={12} /> La URL identifica tu perfil. Para un analisis preciso, pega el contenido o sube el PDF.</p>
              </div>
              <div className="input-group">
                <label><span><FileText size={14} /> Contenido del perfil (opcional, recomendado)</span><textarea value={form.pastedContent} onChange={(e) => setForm({ ...form, pastedContent: e.target.value })} placeholder="Pega aqui el texto de tu perfil de LinkedIn (Headline, About, Skills, Certificaciones, etc.) para un analisis mas preciso." rows={5} /></label>
              </div>
              <div className="input-group">
                <label className="pdf-upload"><span><Upload size={14} /> Subir PDF de LinkedIn (opcional)</span>
                  <div className="pdf-dropzone">
                    <input type="file" accept=".pdf" onChange={(e) => setForm({ ...form, pdfFile: e.target.files?.[0] || null })} />
                    {form.pdfFile ? <span className="pdf-selected"><CheckCircle2 size={16} /> {form.pdfFile.name}</span> : <span className="pdf-placeholder">Arrastra o selecciona un archivo PDF</span>}
                  </div>
                </label>
              </div>
              <div className="input-row">
                <label><span><Globe2 size={14} /> Industria</span>
                  <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value as Industry })}>
                    {industries.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                  </select>
                </label>
              </div>
              <div className="input-group">
                <label><span><Lock size={14} /> Tu email (obligatorio para recibir el informe)</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="tu@email.com" /></label>
              </div>
            </>
          )}

          {analysisError && (
            <div className="analysis-error" role="alert">
              <Info size={14} />
              <p>{analysisError}</p>
              <button type="button" onClick={onDismissError} aria-label="Cerrar aviso"><X size={14} /></button>
            </div>
          )}

          <button className="button button-gold wide-button" disabled={!canAnalyze || needsEmail || isSubmitting} onClick={onAnalyze}>
            {isSubmitting ? 'Analizando tu perfil...' : <>Analizar mi perfil y ver mi posicion <ArrowRight size={16} /></>}
          </button>
          {needsEmail && !form.demoId && <p className="input-hint center"><Lock size={12} /> Necesitamos tu email para enviarte el informe completo.</p>}
          <p className="trust-microcopy"><Lock size={12} /> No almacenamos tu perfil. Solo analizamos el contenido que nos proporcionas. Tu informe es privado.</p>
        </div>
      </div>
    </main>
  );
}

function Analyzing({ ready, onComplete }: { ready: boolean; onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const completedRef = useRef(false);

  // La barra siempre sube a un ritmo constante hasta 99% (~6.5s, sensacion de
  // analisis real). Si el motor de IA todavia no respondio al llegar ahi, se
  // queda esperando en 99% (no se congela ni retrocede) hasta que `ready`
  // sea true. Nunca avanza a resultados antes de tener un resultado real.
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 99 ? 99 : Math.min(prev + 1.5, 99)));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (ready && !completedRef.current) {
      completedRef.current = true;
      setProgress(100);
      const t = setTimeout(onComplete, 400);
      return () => clearTimeout(t);
    }
  }, [ready, onComplete]);

  const messageIndex = ready
    ? scanMessages.length - 1
    : Math.min(Math.floor((progress / 100) * scanMessages.length), scanMessages.length - 1);

  return (
    <main className="analyzing page-wrap">
      <div className="scan-ring"><ScanLine size={42} /><div className="scan-sweep" /></div>
      <span className="section-label">ANALIZANDO TU PERFIL</span>
      <h1>Procesando tu posicion<br /><em>en la era de la IA.</em></h1>
      <div className="scan-progress"><div className="scan-progress-bar" style={{ width: `${progress}%` }} /></div>
      <p className="scan-message">{progress >= 99 && !ready ? 'Casi listo, comparando con tu industria...' : scanMessages[messageIndex]}</p>
      <div className="scan-status">
        {scanMessages.map((_, i) => <span key={i} className={i <= messageIndex ? 'active' : ''}><i /> {scanMessages[i]}</span>)}
      </div>
    </main>
  );
}

function Results({ result, content, form, leadSaved, isTestMode, onStartDiagnostic, onReset }: { result: ScoreResult; content: ProfileContent | null; form: FormData; leadSaved: boolean; isTestMode: boolean; onStartDiagnostic: () => void; onReset: () => void }) {
  const [copied, setCopied] = useState(false);
  const [animatedScore, setAnimatedScore] = useState(0);
  const industryAvg = 45;
  const top10Avg = 82;

  useEffect(() => {
    const duration = 1200;
    const steps = 60;
    const increment = result.total / steps;
    let current = 0;
    const interval = setInterval(() => {
      current += increment;
      if (current >= result.total) { current = result.total; clearInterval(interval); }
      setAnimatedScore(Math.round(current));
    }, duration / steps);
    return () => clearInterval(interval);
  }, [result.total]);

  const impactMsg = result.total < 40 ? 'Estas por debajo del promedio de tu industria. Hay margen de mejora claro.' : result.total < 60 ? 'Estas en la media. Para destacar necesitas diferenciarte.' : 'Estas por encima del promedio. Ahora toca consolidar tu liderazgo.';

  const copyJSON = () => {
    const json = JSON.stringify({ user: { name: content?.name, email: form.email, industry: form.industry, linkedinUrl: form.linkedinUrl }, scores: result.scores, total: result.total, classification: { level: result.level, percentile: result.percentile, benchmark: result.benchmark }, analysis: { strengths: result.strengths, weaknesses: result.weaknesses, recommendations: result.recommendations }, confidence: result.confidence, metadata: { source: 'AI Maturity Profile', version: '1.0' } }, null, 2);
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadPDF = () => {
    const text = `AI MATURITY SCORE: ${result.total}/100\nNivel: ${result.level}\nPercentil: ${result.percentile}\n\nFORTALEZAS:\n${result.strengths.map((s) => '- ' + s).join('\n')}\n\nDEBILIDADES:\n${result.weaknesses.map((w) => '- ' + w).join('\n')}\n\nRECOMENDACIONES:\n${result.recommendations.map((r) => '- ' + r).join('\n')}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'ai-maturity-report.txt'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="results page-wrap">
      {form.demoId && <div className="demo-banner"><Info size={14} /> Este es un perfil de demostracion. Los datos mostrados son ficticios y sirven para ilustrar el funcionamiento de la herramienta.</div>}
      {isTestMode && !form.demoId && <div className="demo-banner test-mode-banner"><Info size={14} /> MODO PRUEBA: este score es del motor deterministico local, no de Claude. No se guardo ningun dato.</div>}

      <div className="results-hero">
        <div>
          <span className="section-label">INFORME AI MATURITY · {form.industry.toUpperCase()}</span>
          <h1>AI Maturity Score<br /><em>{animatedScore}/100</em></h1>
          <div className="level-badge">{result.level}</div>
          <p className="impact-msg">{impactMsg}</p>
        </div>
        <div className="percentile-stamp">
          <span>{result.percentile}</span>
          <small>vs. benchmark de {form.industry}</small>
        </div>
      </div>

      <section className="comparison-bar-section">
        <div className="comparison-bar">
          <div className="comp-labels"><span>0</span><span>100</span></div>
          <div className="comp-track">
            <div className="comp-marker industry-avg" style={{ left: `${industryAvg}%` }}><span>Promedio<br />industria</span></div>
            <div className="comp-marker top-10" style={{ left: `${top10Avg}%` }}><span>Top 10%</span></div>
            <div className="comp-marker you" style={{ left: `${result.total}%` }}><span>Tu</span></div>
          </div>
        </div>
        <p className="comp-disclaimer"><Info size={12} /> Estos porcentajes representan prevalencia de skills declaradas, no un promedio cientifico del AI Maturity Score.</p>
      </section>

      <section className="category-grid">
        <CategoryCard title="Presencia de IA en Headline y About" score={result.scores.headline + result.scores.about} max={30} tooltip="Evalua si tu titular y seccion About comunican capacidades de IA de forma clara y diferenciada." />
        <CategoryCard title="Skills y Certificaciones" score={result.scores.skills + result.scores.certifications} max={30} tooltip="Mide la cantidad, relevancia y profundidad de tus skills y certificaciones en IA declaradas." />
        <CategoryCard title="Sofisticacion del Lenguaje" score={result.scores.language} max={20} tooltip="Analiza si el perfil menciona automatizacion, integracion de IA en workflows, sistemas predictivos e impacto medible." />
        <CategoryCard title="Actividad y Engagement" score={result.scores.activity} max={20} tooltip="Evalua publicaciones verificables sobre IA en los ultimos 12 meses: frecuencia, profundidad y engagement." />
      </section>

      <section className="swot-grid">
        <div className="swot-card strengths">
          <span className="section-label">FORTALEZAS</span>
          <h3>Lo que ya comunicas bien</h3>
          {result.strengths.map((s, i) => <div key={i} className="swot-item"><CheckCircle2 size={16} /> <p>{s}</p></div>)}
        </div>
        <div className="swot-card weaknesses">
          <span className="section-label">DEBILIDADES</span>
          <h3>Oportunidades de mejora</h3>
          {result.weaknesses.map((w, i) => <div key={i} className="swot-item"><X size={16} /> <p>{w}</p></div>)}
        </div>
      </section>

      <section className="recommendations-section">
        <span className="section-label">3 RECOMENDACIONES PRIORITARIAS</span>
        <h2>Tu plan para subir en el ranking</h2>
        <div className="rec-list">
          {result.recommendations.map((rec, i) => (
            <div key={i} className="rec-item"><span className="rec-number">0{i + 1}</span><p>{rec}</p><ChevronRight size={16} /></div>
          ))}
        </div>
      </section>

      <section className="cta-conversion">
        <div>
          <span className="section-label">TU SIGUIENTE PASO</span>
          <h2>Tu LinkedIn es solo la superficie. ¿Cual es el problema real de tu negocio?</h2>
          <p>Cuentanos donde estas hoy y te damos una orientacion especifica y gratuita, sin compromiso.</p>
          <div className="cta-features"><span><Check size={14} /> 4 preguntas, menos de 1 minuto</span><span><Check size={14} /> Recomendaciones especificas a tu caso</span><span><Check size={14} /> Sin pago ni tarjeta de credito</span></div>
        </div>
        <div className="cta-action">
          <button className="button button-gold" onClick={onStartDiagnostic}>Quiero mi diagnostico de negocio <ArrowRight size={16} /></button>
          <p className="cta-microcopy">Gratis · Te toma menos de 1 minuto</p>
        </div>
      </section>

      <section className="confidence-section">
        <div className="confidence-indicator">
          <span className="section-label">CONFIANZA DEL ANALISIS</span>
          <div className={`confidence-badge ${result.confidence.level.toLowerCase()}`}>{result.confidence.level}</div>
          <div className="confidence-details">
            <div><b>Secciones analizadas:</b> {result.confidence.sectionsAnalyzed.join(', ') || 'Ninguna'}</div>
            <div><b>Secciones faltantes:</b> {result.confidence.missingSections.join(', ') || 'Ninguna'}</div>
          </div>
        </div>
        <p className="disclaimer">Este diagnostico evalua la forma en que el perfil comunica publicamente sus capacidades de IA. No certifica el nivel tecnico real de la persona.</p>
      </section>

      <ShareCardSection result={result} industry={form.industry} />

      <div className="results-actions">
        <button className="action-btn" onClick={copyJSON}><Copy size={15} /> {copied ? 'Copiado' : 'Copiar JSON'}</button>
        <button className="action-btn" onClick={downloadPDF}><Download size={15} /> Descargar informe</button>
        <button className="action-btn" onClick={onReset}><ScanLine size={15} /> Analizar otro perfil</button>
      </div>
      {leadSaved && <div className="lead-saved"><CheckCircle2 size={14} /> Tu informe ha sido guardado. Te enviaremos el resultado a tu email.</div>}
    </main>
  );
}

function ShareCardSection({ result, industry }: { result: ScoreResult; industry: Industry }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    renderShareCard({ score: result.total, level: result.level, percentileTop: result.percentileTop, industry }).then((canvas) => {
      if (cancelled) return;
      canvasElRef.current = canvas;
      canvas.className = 'share-card-canvas';
      const container = containerRef.current;
      if (container) {
        // Bug real: antes se hacia `containerRef.current.innerHTML = ''` en
        // el MISMO div donde React renderizaba condicionalmente el texto de
        // "Generando tarjeta..." ({!ready && <div>...}). Cuando `ready` pasaba
        // a true, React intentaba remover ESE nodo (que el innerHTML='' ya
        // habia borrado por fuera de React) y tiraba
        // "Failed to execute 'removeChild': The node to be removed is not a
        // child of this node" — sin ErrorBoundary, eso desmontaba TODA la
        // app y dejaba solo el fondo negro. Fix: este div (ver JSX abajo)
        // ahora NUNCA tiene hijos renderizados por React — es
        // responsabilidad exclusiva de este efecto, asi que limpiarlo e
        // insertar el canvas aqui nunca choca con la reconciliacion de React.
        while (container.firstChild) container.removeChild(container.firstChild);
        container.appendChild(canvas);
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [result.total, result.level, result.percentileTop, industry]);

  const handleDownload = () => {
    if (canvasElRef.current) downloadCanvasAsPng(canvasElRef.current, 'ai-maturity-score.png');
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(buildLinkedInPostText({ score: result.total, level: result.level, percentileTop: result.percentileTop, industry }));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="share-card-section">
      <span className="section-label">COMPARTE TU RESULTADO</span>
      <h2>Presume tu posicion en LinkedIn</h2>
      <p className="share-card-hint">Descarga la imagen y copia el texto. Ambos se suben a mano a tu post: LinkedIn no permite publicar en automatico desde aqui.</p>
      <div className="share-card-layout">
        <div className="share-card-preview-wrap">
          {!ready && <div className="share-card-loading">Generando tarjeta...</div>}
          {/* Este div nunca recibe hijos de React: el canvas se inserta a mano
              en el useEffect de arriba. Mantenerlo siempre vacio en el JSX es
              lo que evita el choque de reconciliacion (ver comentario arriba). */}
          <div className="share-card-preview" ref={containerRef} />
        </div>
        <div className="share-card-actions">
          <button className="button button-gold" disabled={!ready} onClick={handleDownload}><Download size={16} /> Descargar imagen</button>
          <button className="action-btn" onClick={handleCopyText}><Copy size={15} /> {copied ? 'Copiado' : 'Copiar texto del post'}</button>
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ title, score, max, tooltip }: { title: string; score: number; max: number; tooltip: string }) {
  const [showTip, setShowTip] = useState(false);
  const pct = (score / max) * 100;
  return (
    <div className="category-card">
      <div className="cat-header">
        <span>{title}</span>
        <button className="info-btn" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}><Info size={14} /></button>
        {showTip && <div className="tooltip">{tooltip}</div>}
      </div>
      <div className="cat-score">{score}<small>/{max}</small></div>
      <div className="cat-bar"><i style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

function BusinessDiagnosticForm({
  answers, setAnswers, wantsContact, setWantsContact, isGenerating, onBack, onSubmit,
}: {
  answers: BusinessDiagnosticAnswers;
  setAnswers: (a: BusinessDiagnosticAnswers) => void;
  wantsContact: boolean;
  setWantsContact: (v: boolean) => void;
  isGenerating: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  return (
    <main className="business-diagnostic page-wrap">
      <button className="back-link" onClick={onBack}><ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Volver a mi informe</button>

      <div className="diagnostic-hero">
        <span className="section-label">DIAGNOSTICO GRATUITO DE NEGOCIO</span>
        <h1>Tu LinkedIn es solo la superficie.<br /><em>Hablemos de tu negocio.</em></h1>
        <p>4 preguntas rapidas. Con eso te damos una orientacion especifica de como aplicar IA a tu situacion real, no un consejo generico.</p>
      </div>

      <section className="diagnostic-form">
        <DiagnosticQuestion label="¿Cuantas personas trabajan en tu equipo?">
          <div className="diagnostic-options">
            {teamSizeOptions.map((o) => (
              <button key={o.value} className={answers.teamSize === o.value ? 'diagnostic-option is-selected' : 'diagnostic-option'} onClick={() => setAnswers({ ...answers, teamSize: o.value as TeamSize })}>{o.label}</button>
            ))}
          </div>
        </DiagnosticQuestion>

        <DiagnosticQuestion label="¿Cual es hoy tu mayor cuello de botella?">
          <div className="diagnostic-options">
            {bottleneckOptions.map((o) => (
              <button key={o.value} className={answers.bottleneck === o.value ? 'diagnostic-option is-selected' : 'diagnostic-option'} onClick={() => setAnswers({ ...answers, bottleneck: o.value as Bottleneck })}>{o.label}</button>
            ))}
          </div>
        </DiagnosticQuestion>

        <DiagnosticQuestion label="¿Cual es tu rol en esta decision?">
          <div className="diagnostic-options">
            {decisionRoleOptions.map((o) => (
              <button key={o.value} className={answers.decisionRole === o.value ? 'diagnostic-option is-selected' : 'diagnostic-option'} onClick={() => setAnswers({ ...answers, decisionRole: o.value as DecisionRole })}>{o.label}</button>
            ))}
          </div>
        </DiagnosticQuestion>

        <DiagnosticQuestion label="¿Que tan doloroso es este problema hoy?">
          <div className="diagnostic-options">
            {painIntensityOptions.map((o) => (
              <button key={o.value} className={answers.painIntensity === o.value ? 'diagnostic-option is-selected' : 'diagnostic-option'} onClick={() => setAnswers({ ...answers, painIntensity: o.value as PainIntensity })}>{o.label}</button>
            ))}
          </div>
        </DiagnosticQuestion>

        <label className="diagnostic-checkbox">
          <input type="checkbox" checked={wantsContact} onChange={(e) => setWantsContact(e.target.checked)} />
          <span>Prefiero que un consultor de Cupperlab revise esto conmigo directamente.</span>
        </label>

        <button className="button button-gold wide-button" disabled={isGenerating} onClick={onSubmit}>
          {isGenerating ? 'Generando tu diagnostico...' : <>Ver mi diagnostico <ArrowRight size={16} /></>}
        </button>
        <p className="cta-microcopy">Gratis · No pedimos tarjeta ni pago</p>
      </section>
    </main>
  );
}

function DiagnosticQuestion({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="diagnostic-question">
      <h3>{label}</h3>
      {children}
    </div>
  );
}

function MiniReportView({ report, wantsContact, diagnosticSaved, isTestMode, onReset }: { report: MiniReport; wantsContact: boolean; diagnosticSaved: boolean; isTestMode: boolean; onReset: () => void }) {
  return (
    <main className="mini-report page-wrap">
      <div className="mini-report-card">
        {isTestMode && <div className="demo-banner test-mode-banner"><Info size={14} /> MODO PRUEBA: reporte generado localmente, sin llamar a Claude. No se guardo ningun dato.</div>}
        <span className="section-label">TU DIAGNOSTICO</span>
        <h1>{report.headline}</h1>

        <div className="mini-report-recs">
          {report.recommendations.map((rec, i) => (
            <div key={i} className="rec-item"><span className="rec-number">0{i + 1}</span><p>{rec}</p></div>
          ))}
        </div>

        <p className="mini-report-closing">{report.closingNote}</p>

        {wantsContact && (
          <div className="lead-saved"><CheckCircle2 size={14} /> Anotado: un consultor de Cupperlab te escribira para profundizar en esto.</div>
        )}
        {!diagnosticSaved && (
          <p className="analysis-error">No pudimos guardar tu diagnostico esta vez, pero el contenido de arriba es tuyo igual.</p>
        )}
      </div>

      <ConsultingCTA wantsContact={wantsContact} />

      <div className="mini-report-back">
        <button className="button button-gold" onClick={onReset}>Volver al inicio <ArrowRight size={16} /></button>
      </div>
    </main>
  );
}

// Fase 2.5 (v2): el CTA principal tras el diagnostico ya no es "compra un
// curso" (ticket pequeno) sino "hablemos de tu negocio" — consultoria de
// IA para empresas. Cupperlab suele tener el contacto directo del decisor
// via outbound, asi que este boton es la bisagra real entre el formulario
// gratuito y una llamada comercial agendada. Sin precio en pantalla: precio
// y alcance siguen siendo checkpoint humano del Cupperlab Way.
function ConsultingCTA({ wantsContact }: { wantsContact: boolean }) {
  const mailtoHref = `mailto:juancamilo@cupperlab.com?subject=${encodeURIComponent('Quiero hablar con Cupperlab sobre mi diagnostico')}&body=${encodeURIComponent('Hola, acabo de completar mi diagnostico de negocio con Cupperlab y quiero agendar una conversacion.')}`;

  return (
    <section className="consulting-cta">
      <div>
        <span className="section-label">TU SIGUIENTE PASO</span>
        <h2>¿Resolvemos esto juntos?</h2>
        <p>Con lo que nos contaste ya podemos ver por donde empezar. Una llamada corta basta para saber si tiene sentido trabajar juntos — sin compromiso.</p>
      </div>
      <div className="cta-action">
        <a className="button button-gold wide-button" href={mailtoHref}><Mail size={16} /> Quiero agendar esa llamada</a>
        {wantsContact && (
          <p className="consulting-cta-note"><CheckCircle2 size={14} /> Ya nos pediste contacto directo — te escribimos pronto de todas formas.</p>
        )}
      </div>
    </section>
  );
}

export default App;
