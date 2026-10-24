/**
 * secrets.ts - Local encryption of sensitive tokens using WebCrypto (AES-GCM)
 * Keys are derived via PBKDF2 using a device-local salt and optional user PIN
 */

const STORAGE_KEY_TOKEN = 'al_fitna_enc_pat_v1';
const STORAGE_KEY_SALT = 'al_fitna_salt_v1';

function getOrGenerateSalt(): Uint8Array {
  let raw = localStorage.getItem(STORAGE_KEY_SALT);
  if (!raw) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    raw = btoa(String.fromCharCode(...salt));
    localStorage.setItem(STORAGE_KEY_SALT, raw);
    return salt;
  }
  const binary = atob(raw);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase || 'al-fitna-secure-device-token-passphrase'),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as any,
      iterations: 100000,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function saveEncryptedToken(token: string, pin = ''): Promise<void> {
  if (!token.trim()) {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    return;
  }

  const salt = getOrGenerateSalt();
  const key = await deriveKey(pin, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encodedData = new TextEncoder().encode(token.trim());

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encodedData
  );

  const payload = {
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  };

  localStorage.setItem(STORAGE_KEY_TOKEN, JSON.stringify(payload));
}

export async function loadDecryptedToken(pin = ''): Promise<string | null> {
  const raw = localStorage.getItem(STORAGE_KEY_TOKEN);
  if (!raw) return null;

  try {
    const payload = JSON.parse(raw);
    const salt = getOrGenerateSalt();
    const key = await deriveKey(pin, salt);

    const ivStr = atob(payload.iv);
    const iv = new Uint8Array(ivStr.length);
    for (let i = 0; i < ivStr.length; i++) iv[i] = ivStr.charCodeAt(i);

    const dataStr = atob(payload.data);
    const ciphertext = new Uint8Array(dataStr.length);
    for (let i = 0; i < dataStr.length; i++) ciphertext[i] = dataStr.charCodeAt(i);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

export function hasSavedToken(): boolean {
  return !!localStorage.getItem(STORAGE_KEY_TOKEN);
}

export function clearSavedToken(): void {
  localStorage.removeItem(STORAGE_KEY_TOKEN);
}
