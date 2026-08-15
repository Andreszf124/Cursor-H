/**
 * Validación y extracción de texto de PDFs.
 * El tipo se decide por magic bytes, nunca por extensión ni Content-Type
 * declarado por el cliente (SECURITY.md R3).
 */

export const MAX_CURRICULUM_PDF_BYTES = 10 * 1024 * 1024;

/** "%PDF" */
const PDF_MAGIC: readonly number[] = [0x25, 0x50, 0x44, 0x46];

/** Techo del texto extraído: evita que un PDF enorme infle el prompt de IA. */
const MAX_EXTRACTED_CHARS = 200_000;

export function detectPdf(buffer: Buffer): boolean {
  return (
    buffer.length >= PDF_MAGIC.length &&
    PDF_MAGIC.every((byte, index) => buffer[index] === byte)
  );
}

/** Alias usado por módulos existentes */
export const isPdfBuffer = detectPdf;

/**
 * Extracción de texto sin dependencias nativas: decodifica en latin1 y
 * descarta los bytes de control del contenedor PDF. Suficiente para PDFs
 * con texto plano; se reemplazará por un parser real (pdf-parse) cuando
 * se necesite soportar streams comprimidos.
 * Devuelve cadena vacía si el buffer no es un PDF.
 */
export function extractTextFromPdf(buffer: Buffer): string {
  if (!detectPdf(buffer)) {
    throw new Error('NOT_PDF');
  }

  return buffer
    .toString('latin1')
    .slice(0, MAX_EXTRACTED_CHARS)
    .replace(/[^\S\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E\u00A0-\u024F\r\n]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
