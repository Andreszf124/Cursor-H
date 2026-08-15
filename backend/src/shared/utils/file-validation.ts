/**
 * Validación de archivos por magic bytes — nunca confiar en la extensión
 * ni en el Content-Type declarado por el cliente (SECURITY.md R3).
 */

interface ImageSignature {
  mime: string;
  ext: string;
  bytes: readonly number[];
}

const IMAGE_SIGNATURES: readonly ImageSignature[] = [
  { mime: 'image/jpeg', ext: 'jpg', bytes: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', ext: 'png', bytes: [0x89, 0x50, 0x4e, 0x47] },
];

export interface DetectedImage {
  mime: string;
  ext: string;
}

/** Detecta jpeg/png por firma binaria. Retorna null si no coincide ninguna. */
export function detectImageType(buffer: Buffer): DetectedImage | null {
  for (const signature of IMAGE_SIGNATURES) {
    if (
      buffer.length >= signature.bytes.length &&
      signature.bytes.every((byte, index) => buffer[index] === byte)
    ) {
      return { mime: signature.mime, ext: signature.ext };
    }
  }
  return null;
}
