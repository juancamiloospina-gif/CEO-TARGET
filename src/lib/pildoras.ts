// Catalogo de "pildoras" (Fase 2 del funnel: micro-cursos de 70 EUR).
// Cada pildora se recomienda automaticamente segun el tier de AI Maturity
// Score obtenido en la Fase 1, para que la oferta hable directo al momento
// exacto en el que esta el prospecto (no es la misma conversacion para
// alguien invisible en IA que para alguien que ya lidera en su industria).

export type PildoraTier = 'bajo' | 'medio' | 'alto';

export type PildoraModule = {
  title: string;
  description: string;
};

export type Pildora = {
  id: string;
  tier: PildoraTier;
  title: string;
  tagline: string;
  forWhom: string;
  promise: string;
  price: number;
  currency: 'EUR';
  format: string;
  durationEstimate: string;
  modules: PildoraModule[];
  bonus: string;
};

// Mismos cortes que el mensaje de impacto de Fase 1 (Results): <40 / 40-59 / 60+.
// Mantenerlos identicos evita que el prospecto vea un numero en su reporte y
// una oferta que no corresponde con ese numero.
export function getTier(total: number): PildoraTier {
  if (total < 40) return 'bajo';
  if (total < 60) return 'medio';
  return 'alto';
}

export const pildoraCatalog: Record<PildoraTier, Pildora> = {
  bajo: {
    id: 'pildora-fundamentos-ia',
    tier: 'bajo',
    title: 'Fundamentos de IA para tu perfil profesional',
    tagline: 'Pasa de invisible a creible en IA, con lo que ya sabes hacer.',
    forWhom: 'Para perfiles con score bajo: el problema no es la falta de experiencia, es que tu perfil no la comunica.',
    promise: 'Al terminar tendras un headline, un About y un plan de publicaciones que muestran tu relacion real con la IA, sin inventar nada que no hagas.',
    price: 70,
    currency: 'EUR',
    format: 'Video grabado + plantillas descargables',
    durationEstimate: '~90 minutos de contenido, a tu ritmo',
    modules: [
      { title: 'Por que tu perfil no comunica IA hoy', description: 'Revisamos, con tu propio reporte, exactamente que le falta a tu titular y tu About.' },
      { title: 'El vocabulario que si cuenta', description: 'Que terminos, skills y certificaciones reflejan uso real de IA (y cuales suenan a relleno).' },
      { title: 'Reescribe tu headline y tu About', description: 'Plantilla paso a paso para convertir tu experiencia actual en un perfil que se lee como especializado.' },
      { title: 'Tu primera publicacion sobre IA', description: 'Estructura y plantilla para publicar algo concreto que ya hiciste, sin necesitar ser "influencer".' },
    ],
    bonus: 'Checklist de perfil "antes de publicar" para revisar tu propio trabajo sin depender de nadie mas.',
  },
  medio: {
    id: 'pildora-de-competente-a-referente',
    tier: 'medio',
    title: 'De competente a referente en IA',
    tagline: 'Ya no eres invisible. El siguiente paso es diferenciarte.',
    forWhom: 'Para perfiles en la media de su industria: tienes bases, pero te pareces a los demas que tambien las tienen.',
    promise: 'Al terminar sabras exactamente que te separa del top 10% de tu industria y tendras un sistema simple para publicar sobre tu trabajo con IA cada dos semanas.',
    price: 70,
    currency: 'EUR',
    format: 'Video grabado + plantillas descargables',
    durationEstimate: '~2 horas de contenido, a tu ritmo',
    modules: [
      { title: 'Tu brecha real frente al top 10%', description: 'Usamos tu propio reporte para identificar las 2-3 categorias donde pierdes mas puntos frente al benchmark.' },
      { title: 'Certificaciones y skills que si pesan', description: 'Como elegir la siguiente certificacion o skill a declarar segun impacto real en tu categoria mas debil.' },
      { title: 'Sistema de publicacion quincenal', description: 'Un formato repetible para convertir tu trabajo diario en contenido sobre IA, sin depender de la inspiracion.' },
      { title: 'De conocimiento a caso medible', description: 'Como documentar un resultado propio (tiempo ahorrado, proceso mejorado) para que se lea como evidencia, no como opinion.' },
    ],
    bonus: 'Banco de 12 ideas de publicacion ya estructuradas, listas para adaptar a tu industria.',
  },
  alto: {
    id: 'pildora-autoridad-en-ia',
    tier: 'alto',
    title: 'Autoridad en IA: el siguiente nivel',
    tagline: 'Tu perfil ya destaca. Ahora conviertelo en oportunidades.',
    forWhom: 'Para perfiles por encima del promedio: el reto ya no es demostrar que sabes de IA, es capitalizarlo.',
    promise: 'Al terminar tendras un plan de contenido orientado a generar oportunidades concretas (proyectos, asesorias, ofertas) a partir de tu posicionamiento actual.',
    price: 70,
    currency: 'EUR',
    format: 'Video grabado + plantillas descargables',
    durationEstimate: '~2 horas de contenido, a tu ritmo',
    modules: [
      { title: 'De perfil fuerte a marca personal en IA', description: 'Como pasar de "buen perfil" a ser la referencia interna o externa a la que se consulta.' },
      { title: 'Contenido que genera oportunidades de negocio', description: 'Que tipo de publicaciones atraen conversaciones comerciales reales, no solo likes.' },
      { title: 'Posicionarte para asesorias y proyectos', description: 'Como estructurar tu perfil y tu narrativa para que te propongan proyectos en vez de tener que salir a buscarlos.' },
      { title: 'Tu propio framework de IA aplicada', description: 'Como convertir tu forma de trabajar en un metodo nombrable y repetible dentro de tu industria.' },
    ],
    bonus: 'Sesion grabada de revisión de tu plan de contenido de los proximos 90 dias.',
  },
};
