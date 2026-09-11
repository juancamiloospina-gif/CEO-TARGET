// Fase 2 (v3): el objetivo dejo de ser "vender una pildora de 70 EUR" o
// incluso "vender un curso" — eso es ticket pequeno. El objetivo real es
// calificar al prospecto para una consultoria de IA para empresas ANTES de
// agendar una llamada: Cupperlab suele tener el contacto directo del
// decisor (via outbound), asi que este cuestionario es la unica oportunidad
// de entender el problema real ANTES de esa llamada. Por eso:
// - Se cambio `toolLevel` (que herramientas usan) por dos preguntas que
//   predicen si vale la pena agendar: quien decide, y que tan doloroso es
//   el problema hoy. `toolLevel` era util para recomendar contenido/curso,
//   no para calificar una venta de consultoria.
// - El formulario sigue siendo 4 preguntas (no crece): la pagina "no puede
//   ser eterna" o nadie la completa (decision de Juan).

export type TeamSize = 'solo' | '2-10' | '11-50' | '51-200' | '200+';
export type Bottleneck = 'ventas' | 'atencion_cliente' | 'operaciones' | 'marketing_contenido' | 'datos_reportes';
export type DecisionRole = 'decido_yo' | 'yo_influyo' | 'solo_explorando';
export type PainIntensity = 'leve' | 'moderado' | 'alto' | 'critico';

export type BusinessDiagnosticAnswers = {
  teamSize: TeamSize;
  bottleneck: Bottleneck;
  decisionRole: DecisionRole;
  painIntensity: PainIntensity;
};

export type QuestionOption<T extends string> = { value: T; label: string };

export const teamSizeOptions: QuestionOption<TeamSize>[] = [
  { value: 'solo', label: 'Solo yo' },
  { value: '2-10', label: '2 a 10 personas' },
  { value: '11-50', label: '11 a 50 personas' },
  { value: '51-200', label: '51 a 200 personas' },
  { value: '200+', label: 'Mas de 200 personas' },
];

export const bottleneckOptions: QuestionOption<Bottleneck>[] = [
  { value: 'ventas', label: 'Ventas y captacion de clientes' },
  { value: 'atencion_cliente', label: 'Atencion al cliente / soporte' },
  { value: 'operaciones', label: 'Procesos operativos manuales' },
  { value: 'marketing_contenido', label: 'Marketing y creacion de contenido' },
  { value: 'datos_reportes', label: 'Analisis de datos y reportes' },
];

// Eje "accesibilidad del decisor" del outbound scoring de Cupperlab
// (00_Operating_System/26). Es el dato que mas cambia si vale la pena
// agendar una llamada: hablar con quien no decide nada es tiempo perdido
// para ambos lados.
export const decisionRoleOptions: QuestionOption<DecisionRole>[] = [
  { value: 'decido_yo', label: 'Yo tomo la decision final' },
  { value: 'yo_influyo', label: 'Yo influyo, pero no decido solo' },
  { value: 'solo_explorando', label: 'Estoy explorando, no decido' },
];

// Eje "dolor visible" del outbound scoring: cuantifica la intensidad, no
// solo la categoria (que ya da `bottleneck`). Sin esto, "ventas" podia ser
// un dolor de nivel 2 o de nivel 9 y se veian identicos en el panel.
export const painIntensityOptions: QuestionOption<PainIntensity>[] = [
  { value: 'leve', label: 'Es una molestia, pero convivimos con ella' },
  { value: 'moderado', label: 'Nos quita tiempo real cada semana' },
  { value: 'alto', label: 'Nos esta costando dinero o clientes' },
  { value: 'critico', label: 'Es urgente, esta frenando el negocio' },
];

export type MiniReport = {
  headline: string;
  recommendations: string[];
  closingNote: string;
};

// Fallback 100% local (sin llamar a Claude): usado solo si el motor de IA no
// responde. No inventa datos del negocio, solo da orientacion general segun
// el cuello de botella declarado, para que el prospecto nunca se quede sin
// nada a cambio de haber contestado el cuestionario.
const bottleneckFallback: Record<Bottleneck, MiniReport> = {
  ventas: {
    headline: 'Ventas y captacion suele ser donde la IA da el retorno mas rapido y medible.',
    recommendations: [
      'Cualifica leads automaticamente antes de que lleguen a un vendedor humano, para que el equipo hable solo con quien tiene intencion real de compra.',
      'Usa IA para personalizar el primer contacto (email o LinkedIn) segun el perfil del prospecto, en vez de una plantilla generica.',
      'Automatiza el seguimiento de leads que no responden al primer intento, sin depender de que alguien se acuerde de escribirles.',
    ],
    closingNote: 'Esto es orientacion general: el diagnostico especifico de tu embudo de ventas requiere ver tus numeros reales.',
  },
  atencion_cliente: {
    headline: 'En atencion al cliente, la IA rinde mas resolviendo lo repetitivo que reemplazando personas.',
    recommendations: [
      'Identifica las 3-5 preguntas que mas se repiten y resuelvelas con un asistente automatico antes de escalar a una persona.',
      'Usa IA para resumir conversaciones largas y darle contexto instantaneo a quien retoma el caso.',
      'Mide el tiempo de primera respuesta actual: suele ser el indicador que mas rapido mejora con automatizacion.',
    ],
    closingNote: 'Esto es orientacion general: la automatizacion concreta depende del canal (chat, email, telefono) que mas uses hoy.',
  },
  operaciones: {
    headline: 'Los procesos manuales repetitivos son, casi siempre, la fruta mas facil de tomar con IA.',
    recommendations: [
      'Documenta un proceso manual que se repita todas las semanas y pregunta: ¿esto podria ejecutarlo un sistema con supervision minima?',
      'Empieza por automatizar la parte de captura y validacion de datos, no la decision final: ahi el error humano cuesta mas tiempo.',
      'Prioriza el proceso que mas quejas o retrasos genera, no el que sea tecnicamente mas facil de automatizar.',
    ],
    closingNote: 'Esto es orientacion general: el orden correcto de automatizacion depende de tu operacion especifica.',
  },
  marketing_contenido: {
    headline: 'En marketing, la IA rinde mas como acelerador de produccion que como reemplazo de la estrategia.',
    recommendations: [
      'Usa IA para producir primeras versiones de contenido (copy, variaciones de anuncios, guiones) y deja la edicion final en manos humanas.',
      'Automatiza la adaptacion de una misma pieza de contenido a distintos formatos y canales, en vez de crear cada uno desde cero.',
      'Mide que tipo de contenido generado con IA convierte mejor antes de escalar el volumen de produccion.',
    ],
    closingNote: 'Esto es orientacion general: la estrategia de contenido de fondo sigue siendo una decision humana.',
  },
  datos_reportes: {
    headline: 'En datos y reportes, la IA rinde mas resumiendo y explicando que generando numeros nuevos.',
    recommendations: [
      'Automatiza la consolidacion de reportes que hoy se arma a mano cada semana o mes.',
      'Usa IA para explicar en lenguaje simple los cambios relevantes de un reporte, no solo para producir el reporte.',
      'Empieza con un solo reporte critico (ventas, caja, operacion) antes de intentar automatizar todo el reporting a la vez.',
    ],
    closingNote: 'Esto es orientacion general: el diagnostico especifico depende de donde viven hoy tus datos.',
  },
};

export function buildFallbackMiniReport(bottleneck: Bottleneck): MiniReport {
  return bottleneckFallback[bottleneck];
}

// Score simple de calificacion (eje "dolor" + eje "accesibilidad del
// decisor" del outbound engine de Cupperlab). NO es un score de IA Maturity
// ni pretende ser cientifico: es una heuristica para que el panel interno
// ordene por "a quien llamo primero" en vez de por fecha de envio.
const painWeight: Record<PainIntensity, number> = { leve: 1, moderado: 2, alto: 3, critico: 4 };
const decisionWeight: Record<DecisionRole, number> = { decido_yo: 3, yo_influyo: 2, solo_explorando: 1 };

export function getConsultingReadiness(answers: Pick<BusinessDiagnosticAnswers, 'painIntensity' | 'decisionRole'>): {
  score: number; // 2-7
  label: 'Alta prioridad' | 'Prioridad media' | 'Prioridad baja';
} {
  const score = painWeight[answers.painIntensity] + decisionWeight[answers.decisionRole];
  if (score >= 6) return { score, label: 'Alta prioridad' };
  if (score >= 4) return { score, label: 'Prioridad media' };
  return { score, label: 'Prioridad baja' };
}
