import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export type PdfExtractResult = {
  text: string;
  pageCount: number;
  isEmpty: boolean;
};

/**
 * Extrae el texto de un PDF exportado por el propio usuario (ej. "Perfil.pdf" de LinkedIn).
 * 100% client-side: no sube el archivo a ningun servidor. Deterministico: el mismo PDF
 * siempre produce el mismo texto (pdf.js no usa IA ni heuristicas probabilisticas).
 */
export async function extractPdfText(file: File): Promise<PdfExtractResult> {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let text = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    text += pageText + '\n';
  }

  const trimmed = text.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return { text: trimmed, pageCount: pdf.numPages, isEmpty: trimmed.length < 30 };
}
