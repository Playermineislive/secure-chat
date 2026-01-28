/**
 * Shared types between client and server for the secure chat application
 */

// --- Authentication ---

export interface User {
  id: string;
  email: string;
  createdAt: string;
  lastActive?: string;
  publicKey?: string; // Public key for E2EE
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string; // Added for refresh token flow
  message?: string;
}

// --- Pairing System ---

export interface PairingCode {
  code: string;
  userId: string;
  expiresAt: string;
  isUsed: boolean;
}

export interface GenerateCodeResponse {
  success: boolean;
  code?: string;
  expiresAt?: string;
  message?: string;
}

export interface ConnectCodeRequest {
  code: string;
}

export interface ConnectCodeResponse {
  success: boolean;
  partnerId?: string;
  partnerEmail?: string;
  connectionId?: string; // Useful for immediate context
  message?: string;
}

export interface ConnectionStatus {
  isConnected: boolean;
  partnerId?: string;
  partnerEmail?: string;
  connectionId?: string;
  lastActive?: string;
}

export interface Connection {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: string;
  isActive: boolean;
}

// --- Chat & Messaging ---

export type MessageType = 'text' | 'image' | 'video' | 'file' | 'audio' | 'system';

export interface ChatMessage {
  id: string;
  senderId: string;
  // Content is strictly typed: string for text, object for media
  content: string | MediaContent; 
  timestamp: string;
  type: MessageType;
  // Status flags for UI
  status?: 'sending' | 'sent' | 'delivered' | 'read' | 'failed';
}

export interface MediaContent {
  url?: string; // If stored in cloud (AWS S3/Firebase)
  data?: string; // Base64 (only for small files/thumbnails)
  fileName: string;
  fileType: string;
  fileSize: number;
  thumbnail?: string; // Base64 data URI
  encryptionIV?: string; // Specific IV for this file if encrypted separately
}

// --- End-to-End Encryption (E2EE) ---

export interface EncryptionKeys {
  publicKey: string;  // PEM format
  privateKey: string; // PEM format
}

/**
 * Structure for a securely sent message:
 * 1. Content is encrypted with a random AES Key (AES-GCM)
 * 2. That AES Key is encrypted with the recipient's Public Key (RSA-OAEP)
 */
export interface EncryptedPayload {
  cipherText: string;    // The actual content (AES encrypted)
  encryptedKey: string;  // The AES key (RSA encrypted)
  iv: string;           // Initialization Vector for AES
}

// --- WebSocket & Real-Time Signaling ---

// Discriminator for WebSocket message types
export type WebSocketMessageType = 
  | 'message' 
  | 'typing' 
  | 'user_connected' 
  | 'user_disconnected' 
  | 'error'
  | 'signal'          // For WebRTC/Key Exchange
  | 'pairing_update'; // New: For instant pairing feedback

// Strict payload types for Signaling (WebRTC / Key Exchange)
export type SignalType = 'offer' | 'answer' | 'candidate' | 'public_key';

export interface SignalPayload {
  type: SignalType;
  sdp?: string;       // Session Description Protocol (for Offer/Answer)
  candidate?: any;    // ICE Candidate
  publicKey?: string; // For initial key exchange
}

// The envelope for all WebSocket messages
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  timestamp: string;
  id?: string; // Correlation ID for ack
}

// Specific Data Structures for WS Events
export interface TypingData {
  userId: string;
  isTyping: boolean;
}

export interface PairingUpdateData {
  type: 'connection_established' | 'disconnected';
  partnerId?: string;
  connectionId?: string;
}

// --- API Utilities ---

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string; // Machine-readable error code (e.g., 'AUTH_EXPIRED')
}

// Helper to keep existing demo working
export interface DemoResponse {
  message: string;
}
