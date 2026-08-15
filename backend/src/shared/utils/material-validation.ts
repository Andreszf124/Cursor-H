/**
 * Validación de materiales académicos por magic bytes (SECURITY.md R3).
 * Nunca se confía en la extensión ni en el Content-Type que declara el cliente.
 */

export const MAX_MATERIAL_BYTES = 10 * 1024 * 1024;

interface FileSignature {
  mime: string;
  ext: string;
  bytes: readonly number[];
}

const SIGNATURES: readonly FileSignature[] = [
  { mime: 'application/pdf', ext: 'pdf', bytes: [0x25, 0x50, 0x44, 0x46] }, // %PDF
  { mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
  { mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  // docx/pptx/xlsx son contenedores ZIP: la firma PK solo confirma el contenedor
  {
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ext: 'docx',
    bytes: [0x50, 0x4b, 0x03, 0x04],
  },
];

export interface DetectedFile {
  mime: string;
  ext: string;
}

/** Detecta pdf/png/jpeg/docx. Retorna null si ninguna firma coincide. */
export function detectMaterialType(buffer: Buffer): DetectedFile | null {
  for (const signature of SIGNATURES) {
    if (
      buffer.length >= signature.bytes.length &&
      signature.bytes.every((byte, index) => buffer[index] === byte)
    ) {
      return { mime: signature.mime, ext: signature.ext };
    }
  }
  return null;
}

/** Texto plano aproximado para generar metadata/chunks (MVP, sin parsers externos). */
export function extractTextSample(buffer: Buffer, limit = 20_000): string {
  const raw = buffer.toString('latin1');
  const matches = raw.match(/[\x20-\x7E\u00A0-\u00FF]{4,}/g) ?? [];
  return matches.join('\n').slice(0, limit);
}

/** Divide texto en fragmentos de tamaño acotado para el índice RAG. */
export function chunkText(text: string, chunkSize = 800): string[] {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) return [];
  const chunks: string[] = [];
  for (let index = 0; index < normalized.length; index += chunkSize) {
    chunks.push(normalized.slice(index, index + chunkSize));
  }
  return chunks.slice(0, 50);
}
