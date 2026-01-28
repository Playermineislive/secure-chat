// Types
export interface KeyPair {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  iv: string;
  encryptedContent: string; // Base64
  encryptedKey?: string; // For hybrid schemes (optional here since we use sharedKey)
}

export interface EncryptedFile {
  iv: string;
  encryptedData: string; // Base64
  fileName: string;
  fileType: string;
  fileSize: number;
}

// --- Helpers ---

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
};

const hexToArrayBuffer = (hex: string): ArrayBuffer => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
};

// --- Key Management ---

/**
 * Generates an RSA-OAEP KeyPair (Public/Private)
 * Returns them as PEM-like Base64 strings for easy storage/transmission.
 */
export const generateKeyPair = async (): Promise<KeyPair> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  const publicKeyBuffer = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKeyBuffer = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  return {
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    privateKey: arrayBufferToBase64(privateKeyBuffer)
  };
};

/**
 * Imports a raw shared key (Hex string) for use with AES-GCM
 */
const importSharedKey = async (sharedKeyHex: string): Promise<CryptoKey> => {
  // SHA-256 output is 256-bit (32 bytes), perfect for AES-256
  const keyBuffer = hexToArrayBuffer(sharedKeyHex);
  return window.crypto.subtle.importKey(
    "raw",
    keyBuffer,
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );
};

// --- Encryption/Decryption ---

export const encryptMessage = async (content: string, sharedKey: string): Promise<EncryptedMessage> => {
  const key = await importSharedKey(sharedKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM
  const encodedContent = new TextEncoder().encode(content);

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encodedContent
  );

  return {
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    encryptedContent: arrayBufferToBase64(encryptedBuffer)
  };
};

export const decryptMessage = async (msg: EncryptedMessage, sharedKey: string): Promise<string> => {
  const key = await importSharedKey(sharedKey);
  const iv = base64ToArrayBuffer(msg.iv);
  const encryptedData = base64ToArrayBuffer(msg.encryptedContent);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encryptedData
  );

  return new TextDecoder().decode(decryptedBuffer);
};

export const encryptFile = async (
  fileData: ArrayBuffer, 
  fileName: string, 
  fileType: string, 
  sharedKey: string
): Promise<EncryptedFile> => {
  const key = await importSharedKey(sharedKey);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    fileData
  );

  return {
    iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
    encryptedData: arrayBufferToBase64(encryptedBuffer),
    fileName,
    fileType,
    fileSize: encryptedBuffer.byteLength
  };
};

export const decryptFile = async (file: EncryptedFile, sharedKey: string): Promise<ArrayBuffer> => {
  const key = await importSharedKey(sharedKey);
  const iv = base64ToArrayBuffer(file.iv);
  const encryptedData = base64ToArrayBuffer(file.encryptedData);

  return window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv: new Uint8Array(iv) },
    key,
    encryptedData
  );
};

// --- Utilities ---

export const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const createBlobUrl = (data: ArrayBuffer, type: string): string => {
  const blob = new Blob([data], { type });
  return URL.createObjectURL(blob);
};

export const isValidEncryptedFile = (file: any): file is EncryptedFile => {
  return (
    file &&
    typeof file.iv === 'string' &&
    typeof file.encryptedData === 'string' &&
    typeof file.fileName === 'string'
  );
};

export const cleanEncryptedMessage = (msg: any): EncryptedMessage | null => {
  if (msg && typeof msg.iv === 'string' && typeof msg.encryptedContent === 'string') {
    return {
      iv: msg.iv,
      encryptedContent: msg.encryptedContent
    };
  }
  return null;
};
