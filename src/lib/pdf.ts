import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfExtractResult = {
  text: string;
  pageCount: number;
  isEmpty: boolean;
};

/**
 * Extrae el texto de un PDF exportado por el propio usuario (ej. "Perfil.pdf"
 * de LinkedIn), preservando los saltos de linea reales del documento.
 *
 * pdf.js devuelve los items de texto en el orden del content stream, SIN
 * saltos de linea propios. Un primer intento que hacia items.join(' ') sin
 * usar la posicion vertical convertia cada pagina entera en UNA sola linea
 * gigante -- y el parser de secciones (parsePastedContent en App.tsx) depende
 * de que cada seccion de LinkedIn ("Extracto", "Experiencia", "Aptitudes
 * principales"...) sea su propia linea. Bug real encontrado probando con un
 * PDF real de LinkedIn: el analisis fallaba con "no pudimos identificar
 * informacion util" incluso con un perfil completo y valido.
 *
 * Fix: agrupamos los items por coordenada Y (misma linea visual = mismo Y,
 * con tolerancia de 2pt) y solo cuando dos coordenadas caen. Deterministico:
 * el mismo PDF siempre produce el mismo texto.
 */
export async function extractPdfText(file: File): Promise<PdfExtractResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const lines: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    let lastY: number | null = null;
    let current: string[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const textItem = item as { str: string; transform: number[] };
      const y = textItem.transform[5];
      if (lastY !== null && Math.abs(y - lastY) > 2) {
        if (current.length) lines.push(current.join(' ').trim());
        current = [];
      }
      if (textItem.str.trim()) current.push(textItem.str);
      lastY = y;
    }
    if (current.length) lines.push(current.join(' ').trim());
  }

  const text = lines.filter(Boolean).join('\n');
  const trimmed = text.replace(/[ \t]+/g, ' ').trim();
  return { text: trimmed, pageCount: pdf.numPages, isEmpty: trimmed.length < 30 };
}
