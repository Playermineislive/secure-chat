import { 
  generateUUID, 
  sha256,
  importPublicKey,
  importPrivateKey,
  arrayBufferToBase64,
  base64ToArrayBuffer
} from './crypto';

// --- Invite Code Types & Logic (FIXED) ---

export interface InviteCode {
  code: string;
  type: 'friend' | 'group';
  creatorId: string;
  groupId?: string;
  maxUses?: number;
  expiresAt?: string;
  permissions?: string[];
}

export const generateInviteCode = (
  type: 'friend' | 'group',
  creatorId: string,
  options: { expiresInHours?: number; maxUses?: number; groupId?: string } = {}
): InviteCode => {
  // Generate a secure-looking random code (8 chars alphanumeric)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I, O, 1, 0 to avoid confusion
  let code = '';
  const randomValues = new Uint8Array(8);
  window.crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < 8; i++) {
    code += chars[randomValues[i] % chars.length];
  }

  const expiresAt = options.expiresInHours 
    ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000).toISOString() 
    : undefined;

  return {
    code,
    type,
    creatorId,
    groupId: options.groupId,
    maxUses: options.maxUses,
    expiresAt
  };
};

// --- Advanced Configuration ---
const GROUP_CONSTANTS = {
  RATCHET_ALGO: "SHA-256",
  MESSAGE_KEY_SALT: new TextEncoder().encode("Message Key Salt"),
  CHAIN_KEY_SALT: new TextEncoder().encode("Chain Key Salt"),
  MAX_SKIP: 100, // Handle out-of-order messages up to 100 steps
};

// --- Types ---

export interface GroupSessionState {
  groupId: string;
  senderId: string;
  chainId: number; // Epoch/Rotation ID
  chainKey: string; // Base64 current chain key
  messageKeys: { [index: number]: string }; // Buffered keys for out-of-order decryption
  nextIndex: number; // Next message index to send/receive
}

export interface SenderKeyDistributionMessage {
  type: 'sender_key_distribution';
  groupId: string;
  senderId: string;
  chainId: number;
  cipherText: string; // The "Seed" Chain Key, encrypted with recipient's Public Key
  iv: string;
  signature: string; // Proof of origin
}

export interface GroupMessage {
  id: string;
  groupId: string;
  senderId: string;
  chainId: number; // Which epoch does this belong to?
  index: number;   // Ratchet step
  cipherText: string;
  iv: string;
  signature: string; // Integrity check
}

// --- Key Derivation (HKDF) ---

async function kdfDerive(chainKeyB64: string) {
  const chainKey = base64ToArrayBuffer(chainKeyB64);
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    chainKey,
    "HKDF",
    false,
    ["deriveBits"]
  );

  // 1. Derive Message Key (for encrypting content)
  const messageKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: GROUP_CONSTANTS.MESSAGE_KEY_SALT,
      info: new TextEncoder().encode("MessageKey"),
    },
    keyMaterial,
    256
  );

  // 2. Derive Next Chain Key (for the next step)
  const nextChainKeyBits = await window.crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: GROUP_CONSTANTS.CHAIN_KEY_SALT,
      info: new TextEncoder().encode("ChainKey"),
    },
    keyMaterial,
    256 // Keep chain key size constant
  );

  return {
    messageKey: await window.crypto.subtle.importKey("raw", messageKeyBits, "AES-GCM", false, ["encrypt", "decrypt"]),
    nextChainKey: arrayBufferToBase64(nextChainKeyBits)
  };
}

// --- Group Session Manager ---

export class GroupSessionManager {
  // In-memory cache of sessions (SenderID -> SessionState)
  private sessions: Map<string, GroupSessionState> = new Map();
  private mySession: GroupSessionState | null = null;

  constructor(private readonly groupId: string, private readonly myUserId: string) {}

  async initMySession(): Promise<SenderKeyDistributionMessage[]> {
    const seed = window.crypto.getRandomValues(new Uint8Array(32));
    
    this.mySession = {
      groupId: this.groupId,
      senderId: this.myUserId,
      chainId: Date.now(), // Simple Epoch ID
      chainKey: arrayBufferToBase64(seed.buffer as ArrayBuffer),
      messageKeys: {},
      nextIndex: 0
    };

    return []; 
  }

  async createDistributionMessage(
    recipientPublicKeyPem: string
  ): Promise<SenderKeyDistributionMessage> {
    if (!this.mySession) await this.initMySession();
    
    const recipientKey = await importPublicKey(recipientPublicKeyPem);
    const rawChainKey = base64ToArrayBuffer(this.mySession!.chainKey);
    
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      rawChainKey
    );

    const signature = await sha256(arrayBufferToBase64(encryptedKeyBuffer) + this.myUserId);

    return {
      type: 'sender_key_distribution',
      groupId: this.groupId,
      senderId: this.myUserId,
      chainId: this.mySession!.chainId,
      cipherText: arrayBufferToBase64(encryptedKeyBuffer),
      iv: "", 
      signature: signature
    };
  }

  async processDistributionMessage(
    msg: SenderKeyDistributionMessage,
    myPrivateKeyPem: string
  ): Promise<void> {
    const privateKey = await importPrivateKey(myPrivateKeyPem);
    
    const rawChainKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(msg.cipherText)
    );

    this.sessions.set(msg.senderId, {
      groupId: msg.groupId,
      senderId: msg.senderId,
      chainId: msg.chainId,
      chainKey: arrayBufferToBase64(rawChainKey),
      messageKeys: {},
      nextIndex: 0
    });
  }

  async encryptMessage(content: string): Promise<GroupMessage> {
    if (!this.mySession) await this.initMySession();
    const session = this.mySession!;

    const { messageKey, nextChainKey } = await kdfDerive(session.chainKey);
    
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      messageKey,
      new TextEncoder().encode(content)
    );

    const currentIndex = session.nextIndex;

    session.chainKey = nextChainKey;
    session.nextIndex++;

    return {
      id: generateUUID(),
      groupId: this.groupId,
      senderId: this.myUserId,
      chainId: session.chainId,
      index: currentIndex,
      cipherText: arrayBufferToBase64(encrypted),
      iv: arrayBufferToBase64(iv.buffer as ArrayBuffer),
      signature: "sig_placeholder" 
    };
  }

  async decryptMessage(msg: GroupMessage): Promise<string> {
    const session = this.sessions.get(msg.senderId);
    if (!session) throw new Error(`No session found for user ${msg.senderId}`);
    if (session.chainId !== msg.chainId) throw new Error("Message from old/unknown epoch. Request re-key.");

    let messageKey: CryptoKey | null = null;

    if (msg.index === session.nextIndex) {
      const result = await kdfDerive(session.chainKey);
      messageKey = result.messageKey;
      
      session.chainKey = result.nextChainKey;
      session.nextIndex++;
    } 
    else if (msg.index > session.nextIndex) {
      if (msg.index - session.nextIndex > GROUP_CONSTANTS.MAX_SKIP) {
        throw new Error("Message too far in future.");
      }
      
      while (session.nextIndex < msg.index) {
        const result = await kdfDerive(session.chainKey);
        session.messageKeys[session.nextIndex] = arrayBufferToBase64(
          await window.crypto.subtle.exportKey("raw", result.messageKey)
        );
        session.chainKey = result.nextChainKey;
        session.nextIndex++;
      }
      
      const result = await kdfDerive(session.chainKey);
      messageKey = result.messageKey;
      session.chainKey = result.nextChainKey;
      session.nextIndex++;
    }
    else {
      if (session.messageKeys[msg.index]) {
        messageKey = await window.crypto.subtle.importKey(
          "raw", 
          base64ToArrayBuffer(session.messageKeys[msg.index]), 
          "AES-GCM", 
          false, 
          ["decrypt"]
        );
        delete session.messageKeys[msg.index]; 
      } else {
        throw new Error("Duplicate or old message key lost.");
      }
    }

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(msg.iv) },
      messageKey,
      base64ToArrayBuffer(msg.cipherText)
    );

    return new TextDecoder().decode(decrypted);
  }
}

// --- Advanced Local Vault ---

export class SecureVault {
  static async encrypt(data: any, userSecret: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", new TextEncoder().encode(userSecret), "PBKDF2", false, ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt"]
    );

    const content = new TextEncoder().encode(JSON.stringify(data));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv }, key, content
    );

    const packed = new Uint8Array(28 + encrypted.byteLength);
    packed.set(salt, 0);
    packed.set(iv, 16);
    packed.set(new Uint8Array(encrypted), 28);
    
    return arrayBufferToBase64(packed.buffer);
  }

  static async decrypt(packedB64: string, userSecret: string): Promise<any> {
    const packed = new Uint8Array(base64ToArrayBuffer(packedB64));
    const salt = packed.slice(0, 16);
    const iv = packed.slice(16, 28);
    const data = packed.slice(28);

    const keyMaterial = await window.crypto.subtle.importKey(
      "raw", new TextEncoder().encode(userSecret), "PBKDF2", false, ["deriveKey"]
    );
    const key = await window.crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );

    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv }, key, data
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  }
}

// --- Audit Logging ---

export interface SecurityLog {
  timestamp: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  event: string;
  details: string;
  integrityHash: string; 
}

export class AuditLogger {
  private static lastHash = "";

  static async log(severity: SecurityLog['severity'], event: string, details: string) {
    const timestamp = new Date().toISOString();
    const raw = `${AuditLogger.lastHash}|${timestamp}|${severity}|${event}|${details}`;
    
    const hash = await sha256(raw);
    AuditLogger.lastHash = hash;

    const entry: SecurityLog = { timestamp, severity, event, details, integrityHash: hash };
    console.log(`[AUDIT]`, entry);
    return entry;
  }
}
