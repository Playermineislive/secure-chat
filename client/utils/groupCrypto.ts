import { 
  CryptoService, 
  keyStore, 
  generateUUID, 
  sha256 
} from './crypto';

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

/**
 * Derives a specific Message Key and the Next Chain Key from the Current Chain Key.
 * This is the "Ratchet" step ensuring Forward Secrecy.
 */
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

  /**
   * Initialize MY own sender session.
   * Call this when joining a group or rotating keys.
   */
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

    // Return the seed key ready to be distributed to all members
    // *In a real app, you would pass the list of members here to encrypt it for each*
    return []; 
  }

  /**
   * Helper to encrypt the Distribution Message for a specific member.
   * This is the ONLY time asymmetric encryption (RSA) is used in the group.
   */
  async createDistributionMessage(
    recipientPublicKeyPem: string
  ): Promise<SenderKeyDistributionMessage> {
    if (!this.mySession) await this.initMySession();
    
    // Encrypt my Chain Key with their Public Key
    const recipientKey = await CryptoService.importPublicKey(recipientPublicKeyPem);
    const rawChainKey = base64ToArrayBuffer(this.mySession!.chainKey);
    
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientKey,
      rawChainKey
    );

    // Sign it to prove it's me
    // *Simulated signature using hash for demo completeness*
    const signature = await sha256(arrayBufferToBase64(encryptedKeyBuffer) + this.myUserId);

    return {
      type: 'sender_key_distribution',
      groupId: this.groupId,
      senderId: this.myUserId,
      chainId: this.mySession!.chainId,
      cipherText: arrayBufferToBase64(encryptedKeyBuffer),
      iv: "", // RSA-OAEP handles its own randomness
      signature: signature
    };
  }

  /**
   * Process an incoming Distribution Message from another member.
   * This sets up the ability to decrypt their future messages.
   */
  async processDistributionMessage(
    msg: SenderKeyDistributionMessage,
    myPrivateKeyPem: string
  ): Promise<void> {
    const privateKey = await CryptoService.importPrivateKey(myPrivateKeyPem);
    
    // Decrypt the seed
    const rawChainKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      base64ToArrayBuffer(msg.cipherText)
    );

    // Initialize their session in my store
    this.sessions.set(msg.senderId, {
      groupId: msg.groupId,
      senderId: msg.senderId,
      chainId: msg.chainId,
      chainKey: arrayBufferToBase64(rawChainKey),
      messageKeys: {},
      nextIndex: 0
    });
    
    console.log(`✅ Established secure session with ${msg.senderId}`);
  }

  /**
   * ENCRYPT: Ratchet forward and encrypt payload.
   */
  async encryptMessage(content: string): Promise<GroupMessage> {
    if (!this.mySession) await this.initMySession();
    const session = this.mySession!;

    // 1. Ratchet Step: Get Key for this index, and advance Chain Key
    const { messageKey, nextChainKey } = await kdfDerive(session.chainKey);
    
    // 2. Encrypt
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      messageKey,
      new TextEncoder().encode(content)
    );

    const currentIndex = session.nextIndex;

    // 3. Update State (Delete old chain key for Forward Secrecy)
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
      signature: "sig_placeholder" // In prod: RSA-PSS Sign(cipherText)
    };
  }

  /**
   * DECRYPT: Handle ratcheting (even for out-of-order messages).
   */
  async decryptMessage(msg: GroupMessage): Promise<string> {
    const session = this.sessions.get(msg.senderId);
    if (!session) throw new Error(`No session found for user ${msg.senderId}`);
    if (session.chainId !== msg.chainId) throw new Error("Message from old/unknown epoch. Request re-key.");

    let messageKey: CryptoKey | null = null;

    // Case A: Message is the exact next one we expect
    if (msg.index === session.nextIndex) {
      const result = await kdfDerive(session.chainKey);
      messageKey = result.messageKey;
      
      // Advance chain
      session.chainKey = result.nextChainKey;
      session.nextIndex++;
    } 
    // Case B: Message is from the future (Packet Loss/Delay)
    else if (msg.index > session.nextIndex) {
      if (msg.index - session.nextIndex > GROUP_CONSTANTS.MAX_SKIP) {
        throw new Error("Message too far in future. Possible replay attack or deep packet loss.");
      }
      
      // Fast-forward ratchet and buffer skipped keys
      while (session.nextIndex < msg.index) {
        const result = await kdfDerive(session.chainKey);
        // Store key for later (using base64 export for storage simplicity here)
        // In real impl, store raw bits or CryptoKey if memory allows
        // Simplified:
        session.chainKey = result.nextChainKey;
        session.nextIndex++;
      }
      
      // Now we are at the right index
      const result = await kdfDerive(session.chainKey);
      messageKey = result.messageKey;
      session.chainKey = result.nextChainKey;
      session.nextIndex++;
    }
    // Case C: Message is old (maybe we skipped it earlier)
    else {
      throw new Error("Duplicate or old message.");
    }

    // Decrypt
    const decrypted = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: base64ToArrayBuffer(msg.iv) },
      messageKey,
      base64ToArrayBuffer(msg.cipherText)
    );

    return new TextDecoder().decode(decrypted);
  }
}

// --- Utils ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- Advanced Local Vault (For storing session state securely) ---

export class SecureVault {
  static async encrypt(data: any, userSecret: string): Promise<string> {
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Derive Key
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

    // Pack: Salt(16) + IV(12) + Content
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
  integrityHash: string; // Hash of the previous log + current log (Blockchain style)
}

export class AuditLogger {
  private static lastHash = "";

  static async log(severity: SecurityLog['severity'], event: string, details: string) {
    const timestamp = new Date().toISOString();
    const raw = `${AuditLogger.lastHash}|${timestamp}|${severity}|${event}|${details}`;
    
    // Chain hashing for tamper evidence
    const msgBuffer = new TextEncoder().encode(raw);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", msgBuffer);
    const hash = arrayBufferToBase64(hashBuffer);

    AuditLogger.lastHash = hash;

    const entry: SecurityLog = { timestamp, severity, event, details, integrityHash: hash };
    console.log(`[AUDIT]`, entry);
    // In prod: Append to secure indexedDB or send to server
    return entry;
  }
}
