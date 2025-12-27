import { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { AuthRequest, AuthResponse, User } from "@shared/api";

// In-memory storage for demo (in production, use a real database)
const users: Map<string, User & { passwordHash: string }> = new Map();
const usersByEmail: Map<string, User & { passwordHash: string }> = new Map();

const JWT_SECRET = process.env.JWT_SECRET || "secure-chat-secret-key-change-in-production";

// Helper function to generate JWT token
const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
};

// Helper function to verify JWT token
export const verifyToken = (token: string): { userId: string } | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string };
  } catch {
    return null;
  }
};

// Helper function to get user by ID
export const getUserById = (id: string): User | null => {
  const user = users.get(id);
  if (!user) return null;
  
  return {
    id: user.id,
    email: user.email,
    createdAt: user.createdAt,
  };
};

export const handleSignup: RequestHandler = async (req, res) => {
  try {
    const { email, password }: AuthRequest = req.body;

    console.log(`Signup attempt for email: ${email}`);

    // Validate input
    if (!email || !password) {
      console.log("Signup failed: Missing email or password");
      const response: AuthResponse = {
        success: false,
        message: "Email and password are required",
      };
      return res.status(400).json(response);
    }

    // Check if user already exists
    if (usersByEmail.has(email)) {
      console.log(`Signup failed: User already exists for email ${email}`);
      const response: AuthResponse = {
        success: false,
        message: "User already exists with this email",
      };
      return res.status(409).json(response);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user: User & { passwordHash: string } = {
      id: uuidv4(),
      email,
      passwordHash,
      createdAt: new Date().toISOString(),
    };

    // Store user
    users.set(user.id, user);
    usersByEmail.set(email, user);

    console.log(`User successfully created: ${email} (ID: ${user.id})`);
    console.log(`Total users now: ${usersByEmail.size}`);

    // Generate token
    const token = generateToken(user.id);

    const response: AuthResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Signup error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, password }: AuthRequest = req.body;

    console.log(`Login attempt for email: ${email}`);
    console.log(`Total registered users: ${usersByEmail.size}`);

    // Validate input
    if (!email || !password) {
      console.log("Login failed: Missing email or password");
      const response: AuthResponse = {
        success: false,
        message: "Email and password are required",
      };
      return res.status(400).json(response);
    }

    // Find user
    const user = usersByEmail.get(email);
    if (!user) {
      console.log(`Login failed: User not found for email ${email}`);
      console.log("Registered emails:", Array.from(usersByEmail.keys()));
      const response: AuthResponse = {
        success: false,
        message: "Invalid email or password",
      };
      return res.status(401).json(response);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      const response: AuthResponse = {
        success: false,
        message: "Invalid email or password",
      };
      return res.status(401).json(response);
    }

    // Generate token
    const token = generateToken(user.id);

    const response: AuthResponse = {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    };

    res.json(response);
  } catch (error) {
    console.error("Login error:", error);
    const response: AuthResponse = {
      success: false,
      message: "Internal server error",
    };
    res.status(500).json(response);
  }
};

export const handleVerifyToken: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const user = getUserById(decoded.userId);
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
