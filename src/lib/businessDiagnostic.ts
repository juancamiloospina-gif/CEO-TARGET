// Fase 2 (v2): en vez de vender una pildora de 70 EUR de entrada, primero
// entendemos el problema real del empresario, le damos un mini-diagnostico
// de valor genuino (generado con Claude, sin costo para el), y con eso
// construimos un perfil de negocio que alimenta el pipeline de venta
// consultiva de Cupperlab (Fase 3), en vez de forzar una venta de
// autoservicio que el prospecto todavia no esta listo para comprar.

export type TeamSize = 'solo' | '2-10' | '11-50' | '51-200' | '200+';
export type Bottleneck = 'ventas' | 'atencion_cliente' | 'operaciones' | 'marketing_contenido' | 'datos_reportes';
export type ToolLevel = 'ninguna' | 'herramientas_sueltas' | 'automatizaciones_basicas' | 'sistemas_propios';
export type Urgency = 'explorando' | 'evaluando_proveedores' | 'presupuesto_asignado' | 'quiere_implementar_ya';

export type BusinessDiagnosticAnswers = {
  teamSize: TeamSize;
  bottleneck: Bottleneck;
  toolLevel: ToolLevel;
  urgency: Urgency;
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

export const toolLevelOptions: QuestionOption<ToolLevel>[] = [
  { value: 'ninguna', label: 'Nada todavia' },
  { value: 'herramientas_sueltas', label: 'Herramientas sueltas (ChatGPT, Canva IA, etc.)' },
  { value: 'automatizaciones_basicas', label: 'Automatizaciones basicas (Zapier, Make, etc.)' },
  { value: 'sistemas_propios', label: 'Sistemas propios o a medida' },
];

export const urgencyOptions: QuestionOption<Urgency>[] = [
  { value: 'explorando', label: 'Explorando, sin plan concreto' },
  { value: 'evaluando_proveedores', label: 'Evaluando opciones o proveedores' },
  { value: 'presupuesto_asignado', label: 'Ya tenemos presupuesto asignado' },
  { value: 'quiere_implementar_ya', label: 'Queremos implementar ya' },
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
