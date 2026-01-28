import { RequestHandler, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { EventEmitter } from "events";
import { 
  PairingCode, 
  GenerateCodeResponse, 
  ConnectCodeRequest, 
  ConnectCodeResponse,
  Connection,
  ConnectionStatus
} from "@shared/api";
import { verifyToken, getUserById } from "./auth";

// --- Constants & Configuration ---
const CONFIG = {
  CODE_LENGTH: 6,
  CODE_TTL_MS: 5 * 60 * 1000, // 5 minutes
  CLEANUP_INTERVAL_MS: 60 * 1000 // 1 minute
};

// --- Storage Interface (Adapter Pattern) ---
// This allows you to easily swap Map for Redis later
interface StorageAdapter {
  saveCode(code: string, data: PairingCode): Promise<void>;
  getCode(code: string): Promise<PairingCode | undefined>;
  removeCode(code: string): Promise<void>;
  
  saveConnection(connection: Connection): Promise<void>;
  getConnection(id: string): Promise<Connection | undefined>;
  removeConnection(id: string): Promise<void>;
  
  // Lookups for User -> Connection
  getUserConnectionId(userId: string): Promise<string | undefined>;
  setUserConnectionId(userId: string, connectionId: string): Promise<void>;
  removeUserConnectionId(userId: string): Promise<void>;
  
  cleanupExpiredCodes(): Promise<void>;
}

// --- In-Memory Implementation ---
class InMemoryStorage implements StorageAdapter {
  private codes = new Map<string, PairingCode>();
  private connections = new Map<string, Connection>();
  private userConnections = new Map<string, string>(); // userId -> connectionId

  async saveCode(code: string, data: PairingCode) { this.codes.set(code, data); }
  async getCode(code: string) { return this.codes.get(code); }
  async removeCode(code: string) { this.codes.delete(code); }

  async saveConnection(conn: Connection) { this.connections.set(conn.id, conn); }
  async getConnection(id: string) { return this.connections.get(id); }
  async removeConnection(id: string) { this.connections.delete(id); }

  async getUserConnectionId(userId: string) { return this.userConnections.get(userId); }
  async setUserConnectionId(userId: string, connId: string) { this.userConnections.set(userId, connId); }
  async removeUserConnectionId(userId: string) { this.userConnections.delete(userId); }

  async cleanupExpiredCodes() {
    const now = new Date();
    for (const [code, data] of this.codes.entries()) {
      if (new Date(data.expiresAt) <= now) {
        this.codes.delete(code);
      }
    }
  }
}

// --- Pairing Service (Business Logic) ---
class PairingService extends EventEmitter {
  constructor(private storage: StorageAdapter) {
    super();
    // Start background cleanup task
    setInterval(() => this.storage.cleanupExpiredCodes(), CONFIG.CLEANUP_INTERVAL_MS);
  }

  /**
   * Generates a secure random code (better than Math.random)
   */
  private generateSecureCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const bytes = crypto.randomBytes(CONFIG.CODE_LENGTH);
    let code = "";
    for (let i = 0; i < CONFIG.CODE_LENGTH; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  async generateCodeForUser(userId: string): Promise<PairingCode> {
    // 1. Ensure user is disconnected from any previous sessions
    await this.disconnectUser(userId);

    // 2. Generate unique code with retry logic
    let code: string;
    let attempts = 0;
    do {
      code = this.generateSecureCode();
      if (++attempts > 10) throw new Error("Could not generate unique code");
    } while (await this.storage.getCode(code));

    const expiresAt = new Date(Date.now() + CONFIG.CODE_TTL_MS).toISOString();

    const pairingCode: PairingCode = {
      code,
      userId,
      expiresAt,
      isUsed: false,
    };

    await this.storage.saveCode(code, pairingCode);
    return pairingCode;
  }

  async connectUserToCode(connectorUserId: string, codeInput: string) {
    const code = codeInput.toUpperCase();
    const pairingData = await this.storage.getCode(code);

    // Validation Logic
    if (!pairingData) throw new Error("Invalid pairing code");
    if (new Date(pairingData.expiresAt) <= new Date()) {
      await this.storage.removeCode(code);
      throw new Error("Pairing code has expired");
    }
    if (pairingData.isUsed) throw new Error("Code already used");
    if (pairingData.userId === connectorUserId) throw new Error("Cannot connect to yourself");

    // Clean up any stale connections for the person *entering* the code
    await this.disconnectUser(connectorUserId);

    // Create the connection
    const connectionId = uuidv4();
    const connection: Connection = {
      id: connectionId,
      userId1: pairingData.userId, // The Host
      userId2: connectorUserId,    // The Client
      createdAt: new Date().toISOString(),
      isActive: true,
    };

    // Store connection data
    await this.storage.saveConnection(connection);
    await this.storage.setUserConnectionId(pairingData.userId, connectionId);
    await this.storage.setUserConnectionId(connectorUserId, connectionId);

    // Mark code as used/remove it
    await this.storage.removeCode(code);

    // EMIT EVENT: Critical for WebSocket integration
    // This allows your WebSocket server to subscribe to this event and bridge the socket instantly
    this.emit("paired", { 
      connectionId, 
      hostId: pairingData.userId, 
      clientId: connectorUserId 
    });

    return { connection, partnerId: pairingData.userId };
  }

  async disconnectUser(userId: string): Promise<boolean> {
    const connectionId = await this.storage.getUserConnectionId(userId);
    if (!connectionId) return false;

    const connection = await this.storage.getConnection(connectionId);
    if (connection) {
      connection.isActive = false;
      await this.storage.saveConnection(connection);
      
      // Clean up lookups
      await this.storage.removeUserConnectionId(connection.userId1);
      await this.storage.removeUserConnectionId(connection.userId2);

      this.emit("disconnected", { 
        connectionId, 
        userId1: connection.userId1, 
        userId2: connection.userId2 
      });
    }
    return true;
  }

  async getUserConnection(userId: string): Promise<Connection | null> {
    const connId = await this.storage.getUserConnectionId(userId);
    if (!connId) return null;
    const conn = await this.storage.getConnection(connId);
    return (conn && conn.isActive) ? conn : null;
  }
}

// --- Initialization ---
const storage = new InMemoryStorage();
export const pairingService = new PairingService(storage);

// --- Express Middleware ---
export const authenticateUser = (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  const token = authHeader.substring(7);
  const decoded = verifyToken(token);
  
  if (!decoded) return res.status(401).json({ success: false, message: "Invalid token" });

  const user = getUserById(decoded.userId);
  if (!user) return res.status(401).json({ success: false, message: "User not found" });

  req.user = user;
  next();
};

// --- Route Handlers ---

export const handleGenerateCode: RequestHandler = async (req: any, res) => {
  try {
    const result = await pairingService.generateCodeForUser(req.user.id);
    const response: GenerateCodeResponse = {
      success: true,
      code: result.code,
      expiresAt: result.expiresAt,
    };
    res.json(response);
  } catch (error: any) {
    console.error("Generate code error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const handleConnectCode: RequestHandler = async (req: any, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: "Code is required" });

    const { partnerId } = await pairingService.connectUserToCode(req.user.id, code);
    const partner = getUserById(partnerId);

    if (!partner) throw new Error("Partner user record missing");

    const response: ConnectCodeResponse = {
      success: true,
      partnerId: partner.id,
      partnerEmail: partner.email,
    };
    res.json(response);
  } catch (error: any) {
    const message = error.message;
    const status = message.includes("Invalid") || message.includes("expired") ? 400 : 500;
    
    // Provide specific error messages for the UI
    res.status(status).json({ success: false, message });
  }
};

export const handleGetConnectionStatus: RequestHandler = async (req: any, res) => {
  try {
    const userId = req.user.id;
    const connection = await pairingService.getUserConnection(userId);

    if (!connection) {
      return res.json({ isConnected: false });
    }

    const partnerId = connection.userId1 === userId ? connection.userId2 : connection.userId1;
    const partner = getUserById(partnerId);

    const response: ConnectionStatus = {
      isConnected: true,
      partnerId,
      partnerEmail: partner?.email,
      connectionId: connection.id,
    };

    res.json(response);
  } catch (error) {
    console.error("Get status error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const handleDisconnect: RequestHandler = async (req: any, res) => {
  try {
    await pairingService.disconnectUser(req.user.id);
    res.json({ success: true, message: "Disconnected successfully" });
  } catch (error) {
    console.error("Disconnect error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// --- Helpers for WebSocket ---

export const getUserConnection = (userId: string) => pairingService.getUserConnection(userId);

export const getPartnerIdForUser = async (userId: string): Promise<string | null> => {
  const connection = await pairingService.getUserConnection(userId);
  if (!connection) return null;
  return connection.userId1 === userId ? connection.userId2 : connection.userId1;
};
