/**
 * Cold Storage Encrypted Ledger Backup System
 * Standard Web Crypto API: PBKDF2 (SHA-256, 100,000 iterations) + AES-256-GCM
 */

export interface EncryptedBackupEnvelope {
  readonly format: 'raBooks-encrypted-backup-v1';
  readonly version: '1.0';
  readonly createdAt: string;
  readonly passwordHint?: string;
  readonly summary: {
    readonly partyCount: number;
    readonly transactionCount: number;
    readonly emiPlanCount: number;
    readonly recurringScheduleCount: number;
    readonly exportedAt: string;
  };
  readonly kdf: {
    readonly algorithm: 'PBKDF2';
    readonly hash: 'SHA-256';
    readonly iterations: number;
    readonly saltBase64: string;
  };
  readonly cipher: {
    readonly algorithm: 'AES-GCM';
    readonly ivBase64: string;
    readonly tagLength: number;
  };
  readonly ciphertextBase64: string;
}

export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Derives a 256-bit AES-GCM key from a passphrase and salt using PBKDF2 with SHA-256.
 */
async function deriveEncryptionKey(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = 100000
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(passphrase),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as unknown as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts arbitrary ledger snapshot data into a standardized secure backup envelope.
 */
export async function createEncryptedLedgerBackup(
  snapshotData: Record<string, unknown>,
  passphrase: string,
  passwordHint?: string
): Promise<EncryptedBackupEnvelope> {
  if (!passphrase || passphrase.length < 4) {
    throw new Error('Please choose a secure password of at least 4 characters.');
  }

  const enc = new TextEncoder();
  const rawJson = JSON.stringify(snapshotData);

  // Generate cryptographically secure salt (16 bytes) and IV (12 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const iterations = 100000;

  const key = await deriveEncryptionKey(passphrase, salt, iterations);

  const ciphertextBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
      tagLength: 128,
    },
    key,
    enc.encode(rawJson)
  );

  const parties = Array.isArray(snapshotData.parties) ? snapshotData.parties.length : 0;
  const transactions = Array.isArray(snapshotData.transactions) ? snapshotData.transactions.length : 0;
  const emiPlans = Array.isArray(snapshotData.emiPlans) ? snapshotData.emiPlans.length : 0;
  const recurringSchedules = Array.isArray(snapshotData.recurringSchedules)
    ? snapshotData.recurringSchedules.length
    : 0;

  return {
    format: 'raBooks-encrypted-backup-v1',
    version: '1.0',
    createdAt: new Date().toISOString(),
    passwordHint: passwordHint?.trim() || undefined,
    summary: {
      partyCount: parties,
      transactionCount: transactions,
      emiPlanCount: emiPlans,
      recurringScheduleCount: recurringSchedules,
      exportedAt: new Date().toISOString(),
    },
    kdf: {
      algorithm: 'PBKDF2',
      hash: 'SHA-256',
      iterations,
      saltBase64: bufferToBase64(salt),
    },
    cipher: {
      algorithm: 'AES-GCM',
      ivBase64: bufferToBase64(iv),
      tagLength: 128,
    },
    ciphertextBase64: bufferToBase64(ciphertextBuffer),
  };
}

/**
 * Decrypts and authenticates an encrypted backup envelope using the user-provided passphrase.
 */
export async function decryptLedgerBackup(
  envelope: EncryptedBackupEnvelope,
  passphrase: string
): Promise<Record<string, unknown>> {
  if (envelope.format !== 'raBooks-encrypted-backup-v1') {
    throw new Error('Unsupported backup format. This file does not appear to be a valid raBooks encrypted backup.');
  }

  const salt = base64ToBuffer(envelope.kdf.saltBase64);
  const iv = base64ToBuffer(envelope.cipher.ivBase64);
  const ciphertext = base64ToBuffer(envelope.ciphertextBase64);

  const key = await deriveEncryptionKey(passphrase, salt, envelope.kdf.iterations || 100000);

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv as unknown as BufferSource,
        tagLength: envelope.cipher.tagLength || 128,
      },
      key,
      ciphertext as unknown as BufferSource
    );

    const dec = new TextDecoder();
    const plainJson = dec.decode(decryptedBuffer);
    const parsed = JSON.parse(plainJson);

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Decrypted payload is not a valid ledger object.');
    }

    return parsed;
  } catch (err: any) {
    if (err.name === 'OperationError') {
      throw new Error('Incorrect password. Please verify your password and try again.');
    }
    throw new Error(err.message || 'Failed to decrypt backup.');
  }
}
