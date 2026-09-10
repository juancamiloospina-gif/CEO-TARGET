export type Industry = 'Retail' | 'Tecnología' | 'Finanzas' | 'Consultoría' | 'Salud' | 'Educación' | 'Manufactura' | 'Product Management' | 'Otro';

export type ProfileContent = {
  name: string;
  headline: string;
  about: string;
  currentRole: string;
  experience: string[];
  education: string[];
  skills: string[];
  certifications: string[];
  projects: string[];
  recentPosts: string[];
  aiRelatedTerms: string[];
  quantifiableResults: string[];
};

export type CategoryScore = {
  headline: number;
  about: number;
  skills: number;
  certifications: number;
  language: number;
  activity: number;
};

export type ScoreResult = {
  scores: CategoryScore;
  total: number;
  level: string;
  percentile: string;
  percentileTop: number;
  benchmark: number;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: { level: string; sectionsAnalyzed: string[]; missingSections: string[] };
};

const AI_KEYWORDS = [
  'artificial intelligence', 'inteligencia artificial', 'ai', 'generative ai', 'ia generativa',
  'machine learning', 'deep learning', 'llm', 'llms', 'nlp', 'natural language processing',
  'procesamiento de lenguaje natural', 'prompt engineering', 'ai strategy', 'estrategia de ia',
  'intelligent automation', 'automatizacion inteligente', 'data science', 'ciencia de datos',
  'predictive analytics', 'analitica predictiva', 'neural networks', 'redes neuronales',
  'computer vision', 'vision por computadora', 'reinforcement learning',
  'transformers', 'gpt', 'chatgpt', 'claude', 'gemini', 'copilot',
  'rag', 'retrieval augmented generation', 'ai agents', 'agentes de ia',
  'mlops', 'model deployment', 'fine-tuning', 'ajuste fino',
];

const AUTOMATION_KEYWORDS = [
  'automatizacion', 'automation', 'workflow', 'flujo de trabajo', 'integration',
  'integracion', 'predictive', 'predictivo', 'optimization', 'optimizacion',
  'data-driven', 'basado en datos', 'governance', 'gobernanza', 'privacy',
  'privacidad', 'risk', 'riesgo', 'ai ethics', 'etica de ia',
  'implementation', 'implementacion', 'deployment', 'despliegue',
  'pipeline', 'orchestration', 'orquestacion',
];

const ACTIVITY_KEYWORDS = [
  'post', 'publicacion', 'article', 'articulo', 'shared', 'compartido',
  'published', 'publicado', 'wrote', 'escribi', 'newsletter', 'blog',
  'webinar', 'podcast', 'conference', 'conferencia', 'talk', 'charla',
  'panel', 'keynote', 'workshop', 'taller',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/\s+/g, ' ').trim();
}

function countMatches(text: string, keywords: string[]): string[] {
  const normalized = normalize(text);
  return keywords.filter((kw) => normalized.includes(kw));
}


function scoreHeadline(headline: string): number {
  if (!headline.trim()) return 0;
  const matches = countMatches(headline, AI_KEYWORDS);
  if (matches.length === 0) return 0;
  const hasSpecific = matches.some((m) =>
    ['generative ai', 'machine learning', 'llm', 'nlp', 'prompt engineering',
     'ai strategy', 'intelligent automation', 'data science', 'predictive analytics',
     'ia generativa', 'machine learning', 'inteligencia artificial', 'agentes de ia'].includes(m)
  );
  const hasRole = /(ceo|cto|founder|director|head|lead|vp|chief|consultant|manager|architect|engineer|estratega|director|fundador)/i.test(headline);
  if (hasSpecific && hasRole) return 12;
  if (hasSpecific) return 8;
  return 4;
}

function scoreAbout(about: string): number {
  if (!about.trim()) return 0;
  const matches = countMatches(about, AI_KEYWORDS);
  if (matches.length === 0) return 0;
  const hasResults = /\d+\s*(%|por ciento|x|veces|horas|euros|€|k|m\b|millon)/i.test(about);
  const hasMethodology = /(metodolog|framework|pipeline|sistema|proceso|implement|despliegue|deploy|integrac|strategy|estrateg)/i.test(about);
  const hasCases = /(cliente|proyecto|caso|result|resultado|implement|solucion|solution)/i.test(about);
  if (hasResults && hasCases) return 18;
  if (hasMethodology && hasCases) return 14;
  if (hasCases || hasMethodology) return 10;
  return 5;
}

function scoreSkills(skills: string[]): number {
  if (!skills.length) return 0;
  const aiSkillNames = [
    'artificial intelligence', 'inteligencia artificial', 'ai', 'generative ai',
    'ia generativa', 'machine learning', 'deep learning', 'llm', 'llms', 'nlp',
    'natural language processing', 'prompt engineering', 'ai strategy',
    'estrategia de ia', 'intelligent automation', 'automatizacion inteligente',
    'data science', 'ciencia de datos', 'predictive analytics',
    'analitica predictiva', 'neural networks', 'redes neuronales',
    'computer vision', 'vision por computadora', 'reinforcement learning',
    'transformers', 'gpt', 'chatgpt', 'rag', 'ai agents', 'agentes de ia',
    'mlops', 'fine-tuning', 'ajuste fino',
  ];
  const normalized = skills.map(normalize);
  const matched = aiSkillNames.filter((kw) => normalized.some((s) => s.includes(kw)));
  const unique = new Set(matched);
  if (unique.size >= 5) return 15;
  if (unique.size >= 3) return 12;
  if (unique.size >= 2) return 8;
  if (unique.size >= 1) return 5;
  return 0;
}

function scoreCertifications(certs: string[]): number {
  if (!certs.length) return 0;
  const aiCertKeywords = [
    'ai', 'artificial intelligence', 'inteligencia artificial', 'machine learning',
    'deep learning', 'generative ai', 'ia generativa', 'prompt engineering',
    'data science', 'ciencia de datos', 'nlp', 'llm', 'ai strategy',
    'tensorflow', 'pytorch', 'aws ai', 'azure ai', 'google ai', 'ibm ai',
    'deep learning specializ', 'machine learning specializ', 'ai for everyone',
    'ai fundamentals', 'ai certification', 'certificacion ia',
  ];
  const normalized = certs.map(normalize);
  const matched = aiCertKeywords.filter((kw) => normalized.some((c) => c.includes(kw)));
  const unique = new Set(matched);
  const hasInstitution = /(stanford|mit|coursera|google|microsoft|aws|amazon|ibm|deeplearning|fast\.ai|nvidia|nvidia|university|universidad|institut)/i.test(certs.join(' '));
  if (unique.size >= 3 && hasInstitution) return 15;
  if (unique.size >= 2) return 10;
  if (unique.size >= 1) return 6;
  return 0;
}

function scoreLanguage(allText: string): number {
  if (!allText.trim()) return 0;
  const aiMatches = countMatches(allText, AI_KEYWORDS);
  const autoMatches = countMatches(allText, AUTOMATION_KEYWORDS);
  const totalMatches = aiMatches.length + autoMatches.length;
  const hasResults = /\d+\s*(%|por ciento|x|veces|horas|euros|€|k\b|m\b|millon)/i.test(allText);
  const hasImplementation = /(implement|implementacion|deploy|despliegue|pipeline|production|produccion|workflow|sistema|system)/i.test(allText);
  const hasGovernance = /(governance|gobernanza|privacy|privacidad|risk|riesgo|ethics|etica|compliance|cumplimiento)/i.test(allText);
  if (totalMatches >= 6 && hasResults && hasImplementation) return 20;
  if (totalMatches >= 4 && (hasResults || hasImplementation)) return 15;
  if (totalMatches >= 3 && (hasResults || hasImplementation || hasGovernance)) return 12;
  if (totalMatches >= 2) return 9;
  if (totalMatches >= 1) return 5;
  return 0;
}

function scoreActivity(posts: string[]): number {
  if (!posts.length) return 0;
  const allPosts = posts.join(' ');
  if (!allPosts.trim()) return 0;
  const aiMatches = countMatches(allPosts, AI_KEYWORDS);
  const activityMatches = countMatches(allPosts, ACTIVITY_KEYWORDS);
  const hasOriginality = /(opinion|analisis|analysis|aprendizaje|learning|caso|case|estudio|study|experiment|result|resultado)/i.test(allPosts);
  const hasEngagement = /(comentar|comment|like|share|compartir|reaccion|reaction|discusion|discussion)/i.test(allPosts);
  if (aiMatches.length >= 3 && activityMatches.length >= 2 && hasOriginality && hasEngagement) return 20;
  if (aiMatches.length >= 2 && activityMatches.length >= 1 && hasOriginality) return 15;
  if (aiMatches.length >= 2 && activityMatches.length >= 1) return 11;
  if (aiMatches.length >= 1 && activityMatches.length >= 1) return 8;
  if (aiMatches.length >= 1) return 5;
  if (activityMatches.length >= 2) return 3;
  return 1;
}

function getLevel(total: number): string {
  if (total >= 80) return 'Referente';
  if (total >= 60) return 'Avanzado';
  if (total >= 40) return 'Competente';
  if (total >= 20) return 'En desarrollo';
  return 'Inicial';
}

function getPercentile(total: number): { label: string; top: number } {
  if (total >= 80) return { label: 'Top 5% (estimado)', top: 5 };
  if (total >= 60) return { label: 'Top 15% (estimado)', top: 15 };
  if (total >= 40) return { label: 'Top 35% (estimado)', top: 35 };
  if (total >= 20) return { label: 'Top 60% (estimado)', top: 60 };
  return { label: 'Top 80% (estimado)', top: 80 };
}

function getBenchmark(industry: Industry): number {
  if (industry === 'Product Management') return 13;
  return 7;
}

function getConfidence(content: ProfileContent): { level: string; sectionsAnalyzed: string[]; missingSections: string[] } {
  const sectionsAnalyzed: string[] = [];
  const missingSections: string[] = [];
  if (content.headline.trim()) sectionsAnalyzed.push('Headline'); else missingSections.push('Headline');
  if (content.about.trim()) sectionsAnalyzed.push('About'); else missingSections.push('About');
  if (content.skills.length) sectionsAnalyzed.push('Skills'); else missingSections.push('Skills');
  if (content.certifications.length) sectionsAnalyzed.push('Certificaciones'); else missingSections.push('Certificaciones');
  if (content.experience.length) sectionsAnalyzed.push('Experiencia'); else missingSections.push('Experiencia');
  if (content.recentPosts.length) sectionsAnalyzed.push('Publicaciones'); else missingSections.push('Publicaciones');
  if (content.projects.length) sectionsAnalyzed.push('Proyectos'); else missingSections.push('Proyectos');
  const analyzed = sectionsAnalyzed.length;
  if (analyzed >= 6) return { level: 'Alta', sectionsAnalyzed, missingSections };
  if (analyzed >= 4) return { level: 'Media', sectionsAnalyzed, missingSections };
  return { level: 'Baja', sectionsAnalyzed, missingSections };
}

function buildStrengths(content: ProfileContent, scores: CategoryScore): string[] {
  const strengths: string[] = [];
  if (scores.headline >= 8) strengths.push('Tu titular profesional comunica claramente tu posicionamiento en IA.');
  if (scores.about >= 14) strengths.push('La seccion About describe casos concretos y resultados medibles de IA.');
  else if (scores.about >= 10) strengths.push('Tu seccion About explica aplicaciones profesionales de IA con contexto.');
  if (scores.skills >= 12) strengths.push('Tienes un conjunto solido de skills relacionadas con IA declaradas en tu perfil.');
  if (scores.certifications >= 10) strengths.push('Cuentas con certificaciones relevantes en IA de instituciones reconocidas.');
  if (scores.language >= 15) strengths.push('El lenguaje del perfil demuestra implementaciones avanzadas con resultados verificables.');
  if (scores.activity >= 15) strengths.push('Mantienes una actividad constante y especializada sobre IA en tus publicaciones.');
  if (content.quantifiableResults.length > 0) strengths.push('Comunicas resultados cuantificables vinculados a proyectos de IA.');
  if (strengths.length === 0) strengths.push('Tu perfil esta en una fase inicial. Esto es una oportunidad para construir tu posicionamiento desde cero.');
  return strengths.slice(0, 4);
}

function buildWeaknesses(content: ProfileContent, scores: CategoryScore): string[] {
  const weaknesses: string[] = [];
  if (scores.headline < 4) weaknesses.push('No aparece evidencia publica de IA en tu titular profesional.');
  if (scores.about < 5) weaknesses.push('El perfil no comunica actualmente aplicaciones de IA en la seccion About.');
  if (scores.skills < 5) weaknesses.push('No se identificaron skills relacionadas con IA visibles en tu perfil.');
  if (scores.certifications < 5) weaknesses.push('No se identificaron certificaciones en IA visibles en tu perfil.');
  if (scores.language < 10) weaknesses.push('No aparece evidencia publica de implementaciones o automatizaciones de IA descritas en el perfil.');
  if (scores.activity < 6) weaknesses.push('No existe evidencia publica de actividad o publicaciones sobre IA en los ultimos 12 meses.');
  return weaknesses.slice(0, 4);
}

function buildRecommendations(content: ProfileContent, scores: CategoryScore, industry: Industry, role: string): string[] {
  const recs: string[] = [];
  if (scores.headline < 8) {
    recs.push(`Actualiza tu titular para incluir tu especializacion concreta en IA. En lugar de un generico "${role || 'professional'} en ${industry}", prueba algo como "${role || 'Professional'} especializado en IA aplicada a ${industry}" con un caso de impacto.`);
  }
  if (scores.about < 14) {
    recs.push(`Reescribe tu seccion About incluyendo 1-2 casos reales de IA en ${industry} con resultados medibles (ej. "reduje un 30% el tiempo de procesamiento automatizando X con IA"). Los casos concretos superan a las palabras de moda.`);
  }
  if (scores.skills < 12) {
    recs.push('Anade skills especificas de IA a tu perfil (Machine Learning, Generative AI, Prompt Engineering, AI Strategy). Si tienes experiencia practica aunque no tengas certificacion, declarala como skill.');
  }
  if (scores.certifications < 10) {
    recs.push('Considera obtener una certificacion reconocida en IA (Google AI Essentials, Microsoft Azure AI, Coursera Deep Learning Specialization). Una certificacion de una institucion reconocida anade credibilidad publica.');
  }
  if (scores.activity < 11) {
    recs.push(`Publica al menos 1 post cada 2 semanas sobre tu experiencia practica con IA en ${industry}. Comparte aprendizajes reales, experimentos o casos. La consistencia construye autoridad mas que la frecuencia esporadica.`);
  }
  if (scores.language < 15) {
    recs.push('Incorpora lenguaje de implementacion concreta en tu perfil: describe pipelines, workflows o sistemas de IA que hayas construido. Menciona gobernanza, privacidad o gestion de riesgos si aplica.');
  }
  if (recs.length === 0) {
    recs.push('Tu perfil ya comunica un posicionamiento solido en IA. El siguiente paso es consolidar tu liderazgo publicando contenido original y casos de estudio que inspiren a otros profesionales de tu sector.');
  }
  return recs.slice(0, 3);
}

// Construye un ScoreResult a partir de puntajes ya calculados (ej. por el motor
// de Claude en analyze-profile). Reutiliza los mismos helpers de nivel/percentil/
// benchmark/confianza que analyzeProfile, para que el resto de la app (Results,
// CategoryCard, etc.) no necesite saber que motor produjo el puntaje.
export function buildResult(
  scores: CategoryScore,
  content: ProfileContent,
  industry: Industry,
  overrides?: { strengths?: string[]; weaknesses?: string[]; recommendations?: string[] }
): ScoreResult {
  const total = scores.headline + scores.about + scores.skills + scores.certifications + scores.language + scores.activity;
  const level = getLevel(total);
  const percentile = getPercentile(total);
  const benchmark = getBenchmark(industry);
  const confidence = getConfidence(content);
  const strengths = overrides?.strengths?.length ? overrides.strengths : buildStrengths(content, scores);
  const weaknesses = overrides?.weaknesses?.length ? overrides.weaknesses : buildWeaknesses(content, scores);
  const recommendations = overrides?.recommendations?.length ? overrides.recommendations : buildRecommendations(content, scores, industry, content.currentRole);
  return {
    scores, total, level, percentile: percentile.label, percentileTop: percentile.top, benchmark,
    strengths, weaknesses, recommendations, confidence,
  };
}

export function analyzeProfile(content: ProfileContent, industry: Industry): ScoreResult {
  const headline = scoreHeadline(content.headline);
  const about = scoreAbout(content.about);
  const skills = scoreSkills(content.skills);
  const certifications = scoreCertifications(content.certifications);
  const allText = [content.headline, content.about, ...content.experience, ...content.skills, ...content.projects].join(' ');
  const language = scoreLanguage(allText);
  const activity = scoreActivity(content.recentPosts);
  const total = headline + about + skills + certifications + language + activity;
  const level = getLevel(total);
  const percentile = getPercentile(total);
  const benchmark = getBenchmark(industry);
  const confidence = getConfidence(content);
  const strengths = buildStrengths(content, { headline, about, skills, certifications, language, activity });
  const weaknesses = buildWeaknesses(content, { headline, about, skills, certifications, language, activity });
  const recommendations = buildRecommendations(content, { headline, about, skills, certifications, language, activity }, industry, content.currentRole);
  return {
    scores: { headline, about, skills, certifications, language, activity },
    total, level, percentile: percentile.label, percentileTop: percentile.top, benchmark,
    strengths, weaknesses, recommendations, confidence,
  };
}
