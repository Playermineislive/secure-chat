import { RequestHandler, Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest, AuthResponse, User } from "@shared/api";

// --- Configuration & Constants ---
const CONFIG = {
  SALT_ROUNDS: 12,
  ACCESS_TOKEN_SECRET: process.env.JWT_ACCESS_SECRET || "access-secret-change-me",
  REFRESH_TOKEN_SECRET: process.env.JWT_REFRESH_SECRET || "refresh-secret-change-me",
  ACCESS_EXPIRY: "15m", // Short-lived for security
  REFRESH_EXPIRY: "7d", // Long-lived for convenience
};

// Internal User Record (includes sensitive data like password hash)
interface UserRecord extends User {
  passwordHash: string;
  refreshToken?: string; // Store hashed refresh token for revocation support
}

// --- Storage Interface (Adapter Pattern) ---
// Allows swapping In-Memory Map for a real DB (Postgres/Mongo) later easily
interface UserStorage {
  save(user: UserRecord): Promise<void>;
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  updateRefreshToken(userId: string, refreshToken: string | null): Promise<void>;
}

// --- In-Memory Implementation ---
class InMemoryUserStorage implements UserStorage {
  private users = new Map<string, UserRecord>();
  private emailIndex = new Map<string, string>(); // Email -> ID lookup

  async save(user: UserRecord) {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email, user.id);
  }

  async findByEmail(email: string) {
    const id = this.emailIndex.get(email);
    return id ? this.users.get(id) || null : null;
  }

  async findById(id: string) {
    return this.users.get(id) || null;
  }

  async updateRefreshToken(userId: string, token: string | null) {
    const user = this.users.get(userId);
    if (user) {
      if (token) user.refreshToken = token;
      else delete user.refreshToken;
      this.users.set(userId, user);
    }
  }
}

// --- Auth Service (Business Logic) ---
class AuthService {
  constructor(private storage: UserStorage) {}

  // Basic Validation
  private validateEmail(email: string): boolean {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  }

  private validatePassword(password: string): boolean {
    // Min 8 chars, at least one number
    return password.length >= 8 && /\d/.test(password); 
  }

  private generateTokens(userId: string) {
    const accessToken = jwt.sign({ userId }, CONFIG.ACCESS_TOKEN_SECRET, { 
      expiresIn: CONFIG.ACCESS_EXPIRY as SignOptions['expiresIn'] 
    });
    
    const refreshToken = jwt.sign({ userId }, CONFIG.REFRESH_TOKEN_SECRET, { 
      expiresIn: CONFIG.REFRESH_EXPIRY as SignOptions['expiresIn'] 
    });

    return { accessToken, refreshToken };
  }

  async signup(req: AuthRequest): Promise<AuthResponse> {
    const { email, password } = req;

    if (!this.validateEmail(email)) throw new Error("INVALID_EMAIL");
    if (!this.validatePassword(password)) throw new Error("WEAK_PASSWORD");

    const existingUser = await this.storage.findByEmail(email);
    if (existingUser) throw new Error("USER_EXISTS");

    const passwordHash = await bcrypt.hash(password, CONFIG.SALT_ROUNDS);
    
    const newUser: UserRecord = {
      id: uuidv4(),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    await this.storage.save(newUser);
    
    const tokens = this.generateTokens(newUser.id);
    
    // In a real app, you might hash the refresh token before storing it
    await this.storage.updateRefreshToken(newUser.id, tokens.refreshToken);

    return {
      success: true,
      user: { id: newUser.id, email: newUser.email, createdAt: newUser.createdAt },
      token: tokens.accessToken,
      // Note: We're not sending refresh token in body in this simple example, 
      // but usually it goes in an HttpOnly cookie.
    };
  }

  async login(req: AuthRequest): Promise<AuthResponse> {
    const { email, password } = req;

    const user = await this.storage.findByEmail(email);
    if (!user) throw new Error("INVALID_CREDENTIALS");

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new Error("INVALID_CREDENTIALS");

    const tokens = this.generateTokens(user.id);
    await this.storage.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      success: true,
      user: { id: user.id, email: user.email, createdAt: user.createdAt },
      token: tokens.accessToken,
    };
  }

  async getUserById(id: string): Promise<User | null> {
    const record = await this.storage.findById(id);
    if (!record) return null;
    // Strip sensitive info
    return { id: record.id, email: record.email, createdAt: record.createdAt };
  }
}

// --- Initialization ---
const storage = new InMemoryUserStorage();
export const authService = new AuthService(storage);

// --- Middleware & Helpers ---

// Extended Request type to include user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, CONFIG.ACCESS_TOKEN_SECRET) as { userId: string };
  } catch {
    return null;
  }
};

// Export helper for other files (like pairing.ts) to use
export const getUserById = (id: string) => authService.getUserById(id);

// --- Route Handlers ---

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const response = await authService.signup(req.body);
    res.status(201).json(response);
  } catch (error: any) {
    if (error.message === "USER_EXISTS") {
      return res.status(409).json({ success: false, message: "User already exists" });
    }
    if (error.message === "INVALID_EMAIL") {
      return res.status(400).json({ success: false, message: "Invalid email format" });
    }
    if (error.message === "WEAK_PASSWORD") {
      return res.status(400).json({ success: false, message: "Password must be 8+ chars and contain a number" });
    }
    
    console.error("Signup error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const response = await authService.login(req.body);
    res.json(response);
  } catch (error: any) {
    if (error.message === "INVALID_CREDENTIALS") {
      return res.status(401).json({ success: false, message: "Invalid email or password" });
    }
    
    console.error("Login error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const handleVerifyToken: RequestHandler = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid or expired token" });
    }

    const user = await authService.getUserById(decoded.userId);
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const response: AuthResponse = {
      success: true,
      user,
    };

    res.json(response);
  } catch (error) {
    console.error("Token verification error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
