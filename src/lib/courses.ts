import type { Bottleneck } from '@/lib/businessDiagnostic';

// Fase 2.5: catalogo de cursos, uno por cada bottleneck de la Fase 2. Es la
// pieza que le da un siguiente paso comercial concreto al mini-reporte: en
// vez de terminar en "gracias, alguien te escribira", el prospecto ve
// exactamente que curso resuelve SU cuello de botella declarado.
//
// Precio: NO se muestra ninguna cifra. Precio y alcance es un checkpoint
// humano del Cupperlab Way (nunca lo decide una IA) — aqui el CTA es
// "habla con nosotros", no un numero inventado. Cuando Juan defina pricing
// real para el catalogo, se anade como campo `priceLabel` opcional.
//
// Videos: cada modulo tiene `videoStatus: 'pending'` a proposito — es el
// unico pedazo que falta para que el demo este completo (grabar). El
// componente que consume esto debe mostrar un placeholder honesto ("video
// en produccion"), nunca simular que el video existe.

export type CourseModule = {
  title: string;
  description: string;
  durationLabel: string;
  videoStatus: 'pending';
};

export type Course = {
  bottleneck: Bottleneck;
  title: string;
  subtitle: string;
  audience: string;
  outcome: string;
  modules: CourseModule[];
};

export const courses: Record<Bottleneck, Course> = {
  ventas: {
    bottleneck: 'ventas',
    title: 'IA para Ventas y Captación',
    subtitle: 'Cualifica, personaliza y da seguimiento sin que se te caigan leads por el camino.',
    audience: 'Equipos comerciales y fundadores que venden directamente.',
    outcome: 'Al terminar: un proceso de calificación y seguimiento de leads con IA, aplicado a tu propio embudo.',
    modules: [
      { title: 'Calificación automática de leads', description: 'Cómo priorizar quién habla primero con un vendedor humano.', durationLabel: '~18 min', videoStatus: 'pending' },
      { title: 'Personalización del primer contacto', description: 'IA para adaptar el mensaje inicial al perfil real del prospecto.', durationLabel: '~15 min', videoStatus: 'pending' },
      { title: 'Seguimiento que no depende de la memoria', description: 'Automatiza el reenganche de leads que no respondieron.', durationLabel: '~12 min', videoStatus: 'pending' },
      { title: 'Taller: monta tu propio flujo', description: 'Aplicación práctica sobre tu embudo de ventas actual.', durationLabel: '~25 min', videoStatus: 'pending' },
    ],
  },
  atencion_cliente: {
    bottleneck: 'atencion_cliente',
    title: 'IA para Atención al Cliente',
    subtitle: 'Resuelve lo repetitivo con IA y deja las conversaciones difíciles a tu equipo.',
    audience: 'Equipos de soporte, CX y atención al cliente.',
    outcome: 'Al terminar: un asistente de primer nivel funcionando sobre tus preguntas más frecuentes reales.',
    modules: [
      { title: 'Mapea tus 5 preguntas más repetidas', description: 'Punto de partida: qué automatizar primero y por qué.', durationLabel: '~14 min', videoStatus: 'pending' },
      { title: 'Asistente de primer nivel', description: 'Cómo montar un flujo que resuelve antes de escalar a una persona.', durationLabel: '~20 min', videoStatus: 'pending' },
      { title: 'Resúmenes de contexto instantáneo', description: 'IA para que quien retoma un caso no empiece de cero.', durationLabel: '~10 min', videoStatus: 'pending' },
      { title: 'Midiendo tiempo de primera respuesta', description: 'El indicador que más rápido mejora con automatización.', durationLabel: '~12 min', videoStatus: 'pending' },
    ],
  },
  operaciones: {
    bottleneck: 'operaciones',
    title: 'IA para Operaciones',
    subtitle: 'Encuentra y automatiza los procesos manuales que más tiempo te cuestan cada semana.',
    audience: 'Equipos de operaciones y responsables de procesos internos.',
    outcome: 'Al terminar: un proceso manual real de tu operación documentado y con un plan de automatización.',
    modules: [
      { title: 'Diagnóstico de procesos repetitivos', description: 'Cómo identificar qué automatizar primero (y qué no).', durationLabel: '~16 min', videoStatus: 'pending' },
      { title: 'Captura y validación de datos con IA', description: 'Por qué empezar aquí y no por la decisión final.', durationLabel: '~15 min', videoStatus: 'pending' },
      { title: 'Priorizar por dolor, no por facilidad técnica', description: 'El proceso que más quejas genera, no el más fácil de tocar.', durationLabel: '~11 min', videoStatus: 'pending' },
      { title: 'Taller: tu primer proceso automatizado', description: 'Aplicación práctica sobre un proceso real de tu operación.', durationLabel: '~28 min', videoStatus: 'pending' },
    ],
  },
  marketing_contenido: {
    bottleneck: 'marketing_contenido',
    title: 'IA para Marketing y Contenido',
    subtitle: 'Acelera la producción de contenido sin perder el criterio editorial humano.',
    audience: 'Equipos de marketing y creación de contenido.',
    outcome: 'Al terminar: un flujo de producción de contenido con IA aplicado a tus propios formatos.',
    modules: [
      { title: 'IA como acelerador, no como estratega', description: 'Dónde rinde la IA en marketing y dónde no.', durationLabel: '~13 min', videoStatus: 'pending' },
      { title: 'Primeras versiones con IA', description: 'Copy, variaciones de anuncios y guiones: producir rápido, editar humano.', durationLabel: '~17 min', videoStatus: 'pending' },
      { title: 'Adaptación multi-formato', description: 'Una pieza, varios canales, sin reescribir desde cero cada vez.', durationLabel: '~14 min', videoStatus: 'pending' },
      { title: 'Qué contenido con IA convierte mejor', description: 'Cómo medir antes de escalar el volumen de producción.', durationLabel: '~12 min', videoStatus: 'pending' },
    ],
  },
  datos_reportes: {
    bottleneck: 'datos_reportes',
    title: 'IA para Datos y Reportes',
    subtitle: 'Deja de armar reportes a mano cada semana y empieza a explicarlos, no solo producirlos.',
    audience: 'Equipos de datos, finanzas y quienes arman reportes recurrentes.',
    outcome: 'Al terminar: un reporte crítico de tu negocio automatizado de principio a fin.',
    modules: [
      { title: 'Consolidación automática de reportes', description: 'El primer candidato: el reporte que hoy se arma a mano.', durationLabel: '~15 min', videoStatus: 'pending' },
      { title: 'Explicar, no solo producir', description: 'IA para traducir cambios de un reporte a lenguaje simple.', durationLabel: '~13 min', videoStatus: 'pending' },
      { title: 'Empieza por uno solo', description: 'Por qué no automatizar todo el reporting a la vez.', durationLabel: '~10 min', videoStatus: 'pending' },
      { title: 'Taller: tu reporte crítico', description: 'Aplicación práctica sobre ventas, caja u operación.', durationLabel: '~24 min', videoStatus: 'pending' },
    ],
  },
};

export function getCourseForBottleneck(bottleneck: Bottleneck): Course {
  return courses[bottleneck];
}

export function getOtherCourses(bottleneck: Bottleneck): Course[] {
  return Object.values(courses).filter((c) => c.bottleneck !== bottleneck);
}
