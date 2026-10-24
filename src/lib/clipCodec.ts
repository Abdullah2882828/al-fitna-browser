/**
 * clipCodec.ts - Encoding & Decoding for Al-Fitna Bookmarklet Payload
 * Contract:
 * - JSON.stringify -> UTF-8 TextEncoder -> if CompressionStream gzip else raw -> base64url (no padding =, - instead of +, _ instead of /)
 * - Prefix: "F1." for gzip, "F0." for uncompressed
 * - Chunked base64 encoding (0x8000 chunks) to prevent stack overflow
 */

export interface ClipBlockV1 {
  i: number;
  lang: string;
  hdr: string;
  hint: string;
  code: string;
}

export interface ClipPayloadV1 {
  app: 'fitna-clipper';
  v: 1;
  t: number;
  src: {
    url: string;
    title: string;
    host: string;
  };
  sel: string | null;
  blocks: ClipBlockV1[];
}

// Convert Uint8Array to base64url using chunked conversion
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const len = bytes.length;
  const chunkSize = 0x8000; // 32KB chunks to prevent call-stack overflow
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    let chunkStr = '';
    for (let j = 0; j < chunk.length; j++) {
      chunkStr += String.fromCharCode(chunk[j]);
    }
    binary += chunkStr;
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Convert base64url string back to Uint8Array
export function base64UrlToBytes(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Check if CompressionStream is supported
export function supportsCompressionStream(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
}

// Compress bytes with gzip if CompressionStream is available
export async function gzipCompress(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(new Blob([bytes as any]).stream().pipeThrough(new CompressionStream('gzip')));
  const buffer = await stream.arrayBuffer();
  return new Uint8Array(buffer);
}

// Decompress gzip bytes
export async function gzipDecompress(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Response(new Blob([bytes as any]).stream().pipeThrough(new DecompressionStream('gzip')));
  const buffer = await stream.arrayBuffer();
  return new Uint8Array(buffer);
}

// Encode ClipPayloadV1 into formatted string: "F1.<base64url>" or "F0.<base64url>"
export async function encodeClipPayload(payload: ClipPayloadV1, forceUncompressed = false): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const utf8Bytes = new TextEncoder().encode(jsonStr);

  if (!forceUncompressed && supportsCompressionStream()) {
    try {
      const compressed = await gzipCompress(utf8Bytes);
      return 'F1.' + bytesToBase64Url(compressed);
    } catch {
      // Fallback to uncompressed on error
    }
  }

  return 'F0.' + bytesToBase64Url(utf8Bytes);
}

// Decode formatted string "F1.<data>" or "F0.<data>" back to ClipPayloadV1
export async function decodeClipPayload(encoded: string): Promise<ClipPayloadV1> {
  const trimmed = encoded.trim();
  if (!trimmed.startsWith('F0.') && !trimmed.startsWith('F1.')) {
    throw new Error('صيغة الترميز غير صالحة. يجب أن تبدأ بـ F0. أو F1.');
  }

  const prefix = trimmed.substring(0, 3);
  const data = trimmed.substring(3);

  const rawBytes = base64UrlToBytes(data);
  let jsonBytes: Uint8Array;

  if (prefix === 'F1.') {
    if (!supportsCompressionStream()) {
      throw new Error('المتصفح لا يدعم فك ضغط Gzip (DecompressionStream).');
    }
    jsonBytes = await gzipDecompress(rawBytes);
  } else {
    jsonBytes = rawBytes;
  }

  const jsonStr = new TextDecoder().decode(jsonBytes);
  const parsed = JSON.parse(jsonStr);

  // Validate schema
  if (!parsed || parsed.app !== 'fitna-clipper' || parsed.v !== 1 || !Array.isArray(parsed.blocks)) {
    throw new Error('الحمولة المستوردة لا تطابق مواصفات الفطنة (ClipPayloadV1).');
  }

  return parsed as ClipPayloadV1;
}

// Helper to check if payload string exceeds hash transfer limit (800,000 chars)
export const MAX_HASH_CHAR_LIMIT = 800000;

export function canTransferViaHash(encodedData: string): boolean {
  return encodedData.length <= MAX_HASH_CHAR_LIMIT;
}
