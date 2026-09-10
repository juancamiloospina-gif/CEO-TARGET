import { useEffect, useRef, useState } from 'react';
import {
  ArrowRight, BarChart3, Check, CheckCircle2, ChevronRight,
  Clock3, Copy, Download, FileText, Globe2, Info, Link2, Lock, Menu,
  Radar, ScanLine, Sparkles, TrendingUp, Upload, UserRound, X, Zap,
} from 'lucide-react';
import { analyzeProfile, type Industry, type ProfileContent, type ScoreResult } from '@/lib/scoring';
import { demoProfiles } from '@/lib/demoProfiles';
import { supabase } from '@/lib/supabase';

type Stage = 'landing' | 'analyzing' | 'results' | 'waitlist';
type FormData = { linkedinUrl: string; pastedContent: string; pdfFile: File | null; email: string; industry: Industry; demoId: string | null };

const industries: Industry[] = ['Retail', 'Tecnología', 'Finanzas', 'Consultoría', 'Salud', 'Educación', 'Manufactura', 'Product Management', 'Otro'];

const scanMessages = [
  'Analizando titular profesional...',
  'Revisando seccion About...',
  'Evaluando skills y certificaciones...',
  'Midiendo sofisticacion del lenguaje...',
  'Comparando con benchmark de tu industria...',
];

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
    const l = line.toLowerCase();
    if (l.startsWith('nombre') || l.startsWith('name')) { name = line.split(/[:—-]/).slice(1).join('').trim() || line; currentSection = ''; continue; }
    if (l.startsWith('titular') || l.startsWith('headline') || l.includes('headline')) { headline = line.split(/[:—-]/).slice(1).join('').trim() || line; currentSection = ''; continue; }
    if (l.startsWith('acerca de') || l.startsWith('about') || l.includes('about')) { currentSection = 'about'; continue; }
    if (l.includes('experiencia') || l.includes('experience')) { currentSection = 'experience'; continue; }
    if (l.includes('educacion') || l.includes('education')) { currentSection = 'education'; continue; }
    if (l.includes('habilidades') || l.includes('skills')) { currentSection = 'skills'; continue; }
    if (l.includes('certificacion') || l.includes('certification')) { currentSection = 'certifications'; continue; }
    if (l.includes('proyectos') || l.includes('projects')) { currentSection = 'projects'; continue; }
    if (l.includes('publicacion') || l.includes('posts') || l.includes('activity') || l.includes('actividad')) { currentSection = 'posts'; continue; }
    if (currentSection === 'about') about += (about ? '\n' : '') + line;
    else if (currentSection === 'experience') experience.push(line);
    else if (currentSection === 'education') education.push(line);
    else if (currentSection === 'skills') skills.push(...line.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    else if (currentSection === 'certifications') certifications.push(line);
    else if (currentSection === 'projects') projects.push(line);
    else if (currentSection === 'posts') recentPosts.push(line);
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
  const [mobileMenu, setMobileMenu] = useState(false);

  const reset = () => { setStage('landing'); setResult(null); setProfileContent(null); setLeadSaved(false); setForm({ linkedinUrl: '', pastedContent: '', pdfFile: null, email: '', industry: 'Tecnología', demoId: null }); };

  const handleAnalyze = () => {
    let content: ProfileContent;
    let industry = form.industry;
    if (form.demoId) {
      const demo = demoProfiles.find((d) => d.id === form.demoId);
      if (!demo) return;
      content = demo.content;
      industry = demo.industry;
    } else if (form.pastedContent.trim()) {
      content = parsePastedContent(form.pastedContent);
    } else if (form.linkedinUrl.trim() && !form.pastedContent.trim()) {
      setStage('analyzing');
      return;
    } else {
      content = parsePastedContent('');
    }
    setProfileContent(content);
    const score = analyzeProfile(content, industry);
    setResult(score);
    setStage('analyzing');
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

      {stage === 'landing' && <Landing form={form} setForm={setForm} onAnalyze={handleAnalyze} />}
      {stage === 'analyzing' && <Analyzing onComplete={() => { if (result) { saveLead(form, result, profileContent, setLeadSaved); setStage('results'); } else { setStage('landing'); } }} />}
      {stage === 'results' && result && <Results result={result} content={profileContent} form={form} leadSaved={leadSaved} onWaitlist={() => setStage('waitlist')} onReset={reset} />}
      {stage === 'waitlist' && <Waitlist email={form.email} onReset={reset} />}

      <footer className="footer">
        <span>© 2024 Cupperlab AI Funnel</span>
        <span>Este diagnostico evalua la forma en que el perfil comunica publicamente sus capacidades de IA. No certifica el nivel tecnico real de la persona.</span>
      </footer>
    </div>
  );
}

async function saveLead(form: FormData, result: ScoreResult, content: ProfileContent | null, setLeadSaved: (v: boolean) => void) {
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

function Landing({ form, setForm, onAnalyze }: { form: FormData; setForm: (f: FormData) => void; onAnalyze: () => void }) {
  const [visitorCount] = useState(() => 1247 + Math.floor(Math.random() * 300));
  const [showDemo, setShowDemo] = useState(false);
  const canAnalyze = form.demoId ? true : (form.linkedinUrl.trim().length > 0 || form.pastedContent.trim().length > 0) && form.email.trim().length > 0;
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

          <button className="button button-gold wide-button" disabled={!canAnalyze || needsEmail} onClick={onAnalyze}>
            Analizar mi perfil y ver mi posicion <ArrowRight size={16} />
          </button>
          {needsEmail && !form.demoId && <p className="input-hint center"><Lock size={12} /> Necesitamos tu email para enviarte el informe completo.</p>}
          <p className="trust-microcopy"><Lock size={12} /> No almacenamos tu perfil. Solo analizamos el contenido que nos proporcionas. Tu informe es privado.</p>
        </div>
      </div>
    </main>
  );
}

function Analyzing({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [messageIndex, setMessageIndex] = useState(0);
  const completedRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + 1.5, 100);
        const msgIdx = Math.min(Math.floor((next / 100) * scanMessages.length), scanMessages.length - 1);
        setMessageIndex(msgIdx);
        if (next >= 100 && !completedRef.current) {
          completedRef.current = true;
          clearInterval(interval);
          setTimeout(onComplete, 400);
        }
        return next;
      });
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <main className="analyzing page-wrap">
      <div className="scan-ring"><ScanLine size={42} /><div className="scan-sweep" /></div>
      <span className="section-label">ANALIZANDO TU PERFIL</span>
      <h1>Procesando tu posicion<br /><em>en la era de la IA.</em></h1>
      <div className="scan-progress"><div className="scan-progress-bar" style={{ width: `${progress}%` }} /></div>
      <p className="scan-message">{scanMessages[messageIndex]}</p>
      <div className="scan-status">
        {scanMessages.map((_, i) => <span key={i} className={i <= messageIndex ? 'active' : ''}><i /> {scanMessages[i]}</span>)}
      </div>
    </main>
  );
}

function Results({ result, content, form, leadSaved, onWaitlist, onReset }: { result: ScoreResult; content: ProfileContent | null; form: FormData; leadSaved: boolean; onWaitlist: () => void; onReset: () => void }) {
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
          <span className="section-label">¿QUIERES SUBIR TU POSICION?</span>
          <h2>¿Quieres subir tu posicion en el ranking de tu industria?</h2>
          <p>Hemos diseñado un sistema practico para que en pocas semanas puedas:</p>
          <div className="cta-features"><span><Check size={14} /> Optimizar tu posicionamiento publico en IA</span><span><Check size={14} /> Construir autoridad real en tu sector</span><span><Check size={14} /> Destacar frente a tus competidores</span></div>
        </div>
        <div className="cta-action">
          <button className="button button-gold" onClick={onWaitlist}>Quiero mejorar mi posicionamiento en IA <ArrowRight size={16} /></button>
          <p className="cta-microcopy">Plazas limitadas. Te avisaremos cuando abramos la proxima cohorte.</p>
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

      <div className="results-actions">
        <button className="action-btn" onClick={copyJSON}><Copy size={15} /> {copied ? 'Copiado' : 'Copiar JSON'}</button>
        <button className="action-btn" onClick={downloadPDF}><Download size={15} /> Descargar informe</button>
        <button className="action-btn" onClick={onReset}><ScanLine size={15} /> Analizar otro perfil</button>
      </div>
      {leadSaved && <div className="lead-saved"><CheckCircle2 size={14} /> Tu informe ha sido guardado. Te enviaremos el resultado a tu email.</div>}
    </main>
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

function Waitlist({ email, onReset }: { email: string; onReset: () => void }) {
  return (
    <main className="waitlist page-wrap">
      <div className="waitlist-card">
        <div className="waitlist-icon"><CheckCircle2 size={32} /></div>
        <span className="section-label">LISTA DE ESPERA</span>
        <h1>Gracias. Tu plaza esta reservada.</h1>
        <p>Te avisaremos cuando abramos la proxima cohorte. Mientras tanto, te enviaremos recursos exclusivos a <strong>{email}</strong>.</p>
        <div className="waitlist-features">
          <div><TrendingUp size={18} /> <span>Recibiras recursos exclusivos sobre IA aplicada</span></div>
          <div><BarChart3 size={18} /> <span>Acceso prioritario a la proxima cohorte</span></div>
          <div><Clock3 size={18} /> <span>Sin compromiso · Puedes darte de baja cuando quieras</span></div>
        </div>
        <button className="button button-gold" onClick={onReset}>Volver al inicio <ArrowRight size={16} /></button>
      </div>
    </main>
  );
}

export default App;
