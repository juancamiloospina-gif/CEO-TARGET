// Tarjeta "Top X%" para compartir en LinkedIn (viralidad). Se genera 100% en
// el navegador con Canvas, sin llamar a ninguna API: cero costo, cero
// latencia de red, funciona igual en modo prueba que en produccion.
//
// El usuario la descarga como PNG y la sube el mismo a su post de LinkedIn:
// LinkedIn no permite pre-rellenar el texto de un post via URL (solo el
// dialogo de "compartir un link"), asi que el flujo real es "descarga la
// imagen + copia el texto + pegalo tu mismo en LinkedIn". No prometemos
// publicacion automatica en ningun lado del copy.

const CARD_WIDTH = 1080;
const CARD_HEIGHT = 1350;

export type ShareCardInput = {
  score: number;
  level: string;
  percentileTop: number;
  industry: string;
};

async function ensureFontsReady(): Promise<void> {
  try {
    await Promise.all([
      document.fonts.load('800 90px "Playfair Display"'),
      document.fonts.load('600 34px "Playfair Display"'),
      document.fonts.load('700 22px "DM Mono"'),
      document.fonts.load('500 26px "DM Mono"'),
    ]);
    await document.fonts.ready;
  } catch {
    // Si por algun motivo no se pueden precargar, seguimos igual: el canvas
    // cae a la fuente por defecto del sistema en vez de romper la descarga.
  }
}

export async function renderShareCard(input: ShareCardInput): Promise<HTMLCanvasElement> {
  await ensureFontsReady();

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo crear el contexto de canvas');

  // Fondo con el mismo degradado oscuro que el resto de la herramienta.
  const bg = ctx.createLinearGradient(0, 0, 0, CARD_HEIGHT);
  bg.addColorStop(0, '#141110');
  bg.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CARD_WIDTH, CARD_HEIGHT);

  // Marco dorado sutil.
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
  ctx.lineWidth = 2;
  ctx.strokeRect(24, 24, CARD_WIDTH - 48, CARD_HEIGHT - 48);

  const centerX = CARD_WIDTH / 2;

  // Marca.
  ctx.fillStyle = '#a5967a';
  ctx.font = '700 24px "DM Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('C U P P E R L A B   ·   A I   M A T U R I T Y', centerX, 150);

  // Etiqueta de industria.
  ctx.fillStyle = '#706d67';
  ctx.font = '500 24px "DM Mono", monospace';
  ctx.fillText(input.industry.toUpperCase(), centerX, 210);

  // Score gigante.
  ctx.fillStyle = '#D4AF37';
  ctx.font = '800 260px "Playfair Display", serif';
  ctx.fillText(String(input.score), centerX, 640);

  ctx.fillStyle = '#8c8374';
  ctx.font = '600 42px "Playfair Display", serif';
  ctx.fillText('/ 100', centerX, 700);

  // Nivel.
  ctx.fillStyle = '#f4f1eb';
  ctx.font = '600 46px "Playfair Display", serif';
  ctx.fillText(input.level, centerX, 800);

  // Bloque "Top X%".
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.6)';
  ctx.lineWidth = 1.5;
  const boxW = 620, boxH = 150, boxY = 860;
  ctx.strokeRect(centerX - boxW / 2, boxY, boxW, boxH);

  ctx.fillStyle = '#D4AF37';
  ctx.font = '800 64px "Playfair Display", serif';
  ctx.fillText(`TOP ${input.percentileTop}%`, centerX, boxY + 95);

  ctx.fillStyle = '#706d67';
  ctx.font = '500 20px "DM Mono", monospace';
  ctx.fillText('ESTIMADO · vs. profesionales de tu industria', centerX, boxY + boxH + 40);

  // Cierre.
  ctx.fillStyle = '#99958e';
  ctx.font = '500 24px "DM Mono", monospace';
  ctx.fillText('Mide tu AI Maturity Score en cupperlab.com', centerX, CARD_HEIGHT - 80);

  return canvas;
}

export function downloadCanvasAsPng(canvas: HTMLCanvasElement, filename: string): void {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}

// Plantilla fija (sin IA, sin costo): variables rellenadas localmente. Se
// mantiene la etiqueta "(estimado)" en el percentil, igual que en el resto
// de la herramienta, para no afirmar una cifra cientifica que no tenemos.
export function buildLinkedInPostText(input: ShareCardInput): string {
  return `Acabo de medir mi AI Maturity Score con la herramienta de Cupperlab: ${input.score}/100 (${input.level}), estimado en el Top ${input.percentileTop}% de profesionales de ${input.industry} en como comunican sus capacidades de IA.

No mide cuanta IA uso de verdad, mide que tan bien lo estoy comunicando en mi perfil. Y ahi hay una diferencia grande entre quienes lo hacen bien y quienes no.

Si quieres ver tu propio resultado (gratis, 2 minutos): [enlace a la herramienta]

#InteligenciaArtificial #AIMaturity #Cupperlab`;
}
