import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_PREFIX = 'enc:v1:';

function getDerivedKey(): Buffer {
  const source = process.env.APP_ENCRYPTION_KEY || process.env.ENCRYPTION_KEY || 'development-fallback-key-please-change';
  return createHash('sha256').update(source).digest();
}

function isEncrypted(value: string): boolean {
  return typeof value === 'string' && value.startsWith(ENCRYPTION_PREFIX);
}

export async function encrypt(plainText: string): Promise<string> {
  if (plainText == null) return '';
  if (isEncrypted(plainText)) return plainText;

  const iv = randomBytes(12); // 96-bit nonce for GCM
  const key = getDerivedKey();

  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv);
  const ciphertextBuffer = Buffer.concat([
    cipher.update(String(plainText), 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  const payload = [
    iv.toString('base64'),
    ciphertextBuffer.toString('base64'),
    authTag.toString('base64'),
  ].join(':');

  return ENCRYPTION_PREFIX + payload;
}

export async function decrypt(encryptedValue: string): Promise<string> {
  if (encryptedValue == null) return '';
  if (!isEncrypted(encryptedValue)) return encryptedValue;

  const key = getDerivedKey();

  const payload = encryptedValue.substring(ENCRYPTION_PREFIX.length);
  const [ivB64, ciphertextB64, tagB64] = payload.split(':');

  const iv = Buffer.from(ivB64, 'base64');
  const ciphertext = Buffer.from(ciphertextB64, 'base64');
  const authTag = Buffer.from(tagB64, 'base64');

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  const decryptedBuffer = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return decryptedBuffer.toString('utf8');
}



