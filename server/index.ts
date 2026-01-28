import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { createServer as createHttpServer } from "http";
import { Server, Socket } from "socket.io";
import { 
  handleSignup, 
  handleLogin, 
  handleVerifyToken, 
  verifyToken, 
  getUserById 
} from "./routes/auth";
import { 
  handleGenerateCode, 
  handleConnectCode, 
  handleGetConnectionStatus, 
  handleDisconnect, 
  authenticateUser, 
  pairingService // Import the service instance we created
} from "./routes/pairing";
import { WebSocketMessage } from "@shared/api";

// --- Types ---
interface AuthenticatedSocket extends Socket {
  userId: string;
  userEmail: string;
}

// --- Socket Manager ---
// Encapsulates all Real-Time logic
class SocketManager {
  private io: Server;
  // Map<UserId, SocketId> - In production, use Redis Adapter for this
  private userSockets = new Map<string, string>(); 
  private userPublicKeys = new Map<string, string>();

  constructor(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupPairingIntegration();
  }

  private setupMiddleware() {
    this.io.use(async (socket, next) => {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error("Authentication error: No token"));

      const decoded = verifyToken(token);
      if (!decoded) return next(new Error("Authentication error: Invalid token"));

      // We can use the service helper directly now
      const user = await getUserById(decoded.userId);
      if (!user) return next(new Error("User not found"));

      // Attach user info to socket
      (socket as AuthenticatedSocket).userId = user.id;
      (socket as AuthenticatedSocket).userEmail = user.email;
      next();
    });
  }

  // Bridging the REST API world with the WebSocket world
  private setupPairingIntegration() {
    // Listen for the 'paired' event emitted by PairingService
    // This allows instant updates when a REST API call finishes successfully
    pairingService.on("paired", ({ connectionId, hostId, clientId }) => {
      console.log(`⚡ Pairing event received: ${hostId} <-> ${clientId}`);

      const hostSocket = this.userSockets.get(hostId);
      const clientSocket = this.userSockets.get(clientId);

      const payload = {
        type: "connection_established",
        connectionId,
        timestamp: new Date().toISOString()
      };

      if (hostSocket) this.io.to(hostSocket).emit("pairing_update", { ...payload, partnerId: clientId });
      if (clientSocket) this.io.to(clientSocket).emit("pairing_update", { ...payload, partnerId: hostId });
    });

    // Handle Disconnects initiated via API
    pairingService.on("disconnected", ({ userId1, userId2 }) => {
      [userId1, userId2].forEach(uid => {
        const sock = this.userSockets.get(uid);
        if (sock) this.io.to(sock).emit("pairing_update", { type: "disconnected" });
      });
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (rawSocket: Socket) => {
      const socket = rawSocket as AuthenticatedSocket;
      console.log(`User connected: ${socket.userEmail} (${socket.userId})`);
      
      this.handleUserConnection(socket);
      
      // Standard Message Handler
      socket.on("send_message", (data) => this.handleMessage(socket, data));
      
      // E2EE Key Exchange / WebRTC Signaling
      socket.on("signal", (data) => this.handleSignaling(socket, data));
      
      // Typing Indicators
      socket.on("typing", (data) => this.handleTyping(socket, data));
      
      // Disconnect
      socket.on("disconnect", () => this.handleDisconnect(socket));
    });
  }

  private async handleUserConnection(socket: AuthenticatedSocket) {
    this.userSockets.set(socket.userId, socket.id);
    
    // Check if they are already paired and notify partner
    const connection = await pairingService.getUserConnection(socket.userId);
    if (connection && connection.isActive) {
      const partnerId = connection.userId1 === socket.userId ? connection.userId2 : connection.userId1;
      const partnerSocket = this.userSockets.get(partnerId);
      
      if (partnerSocket) {
        this.io.to(partnerSocket).emit("user_status", { 
          userId: socket.userId, 
          status: "online" 
        });
      }
    }
  }

  private async handleMessage(socket: AuthenticatedSocket, data: any) {
    try {
      const connection = await pairingService.getUserConnection(socket.userId);
      if (!connection) {
        return socket.emit("error", { message: "No active pairing connection" });
      }

      const partnerId = connection.userId1 === socket.userId ? connection.userId2 : connection.userId1;
      const partnerSocketId = this.userSockets.get(partnerId);

      if (partnerSocketId) {
        const message: WebSocketMessage = {
          type: "message",
          data: {
            senderId: socket.userId,
            content: data.content,
            type: data.type || "text",
            timestamp: new Date().toISOString(),
          },
          timestamp: new Date().toISOString(),
        };
        this.io.to(partnerSocketId).emit("message", message);
        socket.emit("message_sent", { success: true, tempId: data.tempId });
      } else {
        // Optional: Store offline messages here
        socket.emit("error", { message: "Partner is offline" });
      }
    } catch (e) {
      console.error("Message error", e);
    }
  }

  private async handleSignaling(socket: AuthenticatedSocket, data: any) {
    // Generic signaling handler (works for Public Keys OR WebRTC offers/answers)
    const connection = await pairingService.getUserConnection(socket.userId);
    if (!connection) return;

    const partnerId = connection.userId1 === socket.userId ? connection.userId2 : connection.userId1;
    const partnerSocketId = this.userSockets.get(partnerId);

    if (partnerSocketId) {
      this.io.to(partnerSocketId).emit("signal", {
        senderId: socket.userId,
        type: data.type, // 'public_key', 'offer', 'answer', 'candidate'
        payload: data.payload
      });
    }
  }

  private async handleTyping(socket: AuthenticatedSocket, data: { isTyping: boolean }) {
    const connection = await pairingService.getUserConnection(socket.userId);
    if (!connection) return;

    const partnerId = connection.userId1 === socket.userId ? connection.userId2 : connection.userId1;
    const partnerSocketId = this.userSockets.get(partnerId);

    if (partnerSocketId) {
      this.io.to(partnerSocketId).emit("typing", {
        userId: socket.userId,
        isTyping: data.isTyping
      });
    }
  }

  private async handleDisconnect(socket: AuthenticatedSocket) {
    console.log(`User disconnected: ${socket.userEmail}`);
    this.userSockets.delete(socket.userId);
    
    // Notify partner
    const connection = await pairingService.getUserConnection(socket.userId);
    if (connection) {
      const partnerId = connection.userId1 === socket.userId ? connection.userId2 : connection.userId1;
      const partnerSocketId = this.userSockets.get(partnerId);
      if (partnerSocketId) {
        this.io.to(partnerSocketId).emit("user_status", { 
          userId: socket.userId, 
          status: "offline" 
        });
      }
    }
  }
}

// --- App Factory ---

export function createAppServer() {
  const app = express();
  const httpServer = createHttpServer(app);
  
  // Setup Socket.IO
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || "*", 
      methods: ["GET", "POST"]
    }
  });

  // Initialize Socket Logic
  new SocketManager(io);

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request Logging (Optional)
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });

  // --- Routes ---

  app.get("/api/ping", (_req, res) => {
    res.json({ message: "pong", timestamp: new Date() });
  });

  // Auth
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/verify", handleVerifyToken);

  // Pairing (Protected)
  const pairingRouter = express.Router();
  pairingRouter.use(authenticateUser);
  pairingRouter.post("/generate-code", handleGenerateCode);
  pairingRouter.post("/connect-code", handleConnectCode);
  pairingRouter.get("/status", handleGetConnectionStatus);
  pairingRouter.post("/disconnect", handleDisconnect);
  
  app.use("/api/pairing", pairingRouter);

  // Global Error Handler
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled Error:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  });

  return httpServer;
}

// --- Development/Vite Helper ---
export function createServer() {
  // Return just the express app for Vite middleware compatibility
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/ping", (_req, res) => res.json({ message: "pong" }));
  
  app.post("/api/auth/signup", handleSignup);
  app.post("/api/auth/login", handleLogin);
  app.get("/api/auth/verify", handleVerifyToken);

  app.post("/api/pairing/generate-code", authenticateUser, handleGenerateCode);
  app.post("/api/pairing/connect-code", authenticateUser, handleConnectCode);
  app.get("/api/pairing/status", authenticateUser, handleGetConnectionStatus);
  app.post("/api/pairing/disconnect", authenticateUser, handleDisconnect);

  return app;
}
