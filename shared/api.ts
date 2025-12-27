/**
 * Shared types between client and server for the secure chat application
 */

// Authentication types
export interface User {
  id: string;
  email: string;
  createdAt: string;
}

export interface AuthRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}

// Pairing system types
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
  message?: string;
}

// Chat types
export interface Connection {
  id: string;
  userId1: string;
  userId2: string;
  createdAt: string;
  isActive: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  content: string | MediaContent; // Can be text or media
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'file' | 'emoji' | 'typing' | 'status';
}

export interface MediaContent {
  fileName: string;
  fileType: string;
  fileSize: number;
  data: string; // Base64 or encrypted data
  thumbnail?: string; // For videos/images
}

export interface FileUpload {
  file: File;
  type: 'image' | 'video' | 'file';
  thumbnail?: string;
}

// Real-time WebSocket message types
export interface WebSocketMessage {
  type: 'message' | 'typing' | 'user_connected' | 'user_disconnected' | 'error' | 'invite_request' | 'invite_response';
  data: any;
  timestamp: string;
}

// Encryption types (for client-side use)
export interface EncryptionKeys {
  publicKey: string;
  privateKey: string;
}

export interface EncryptedMessage {
  encryptedContent: string;
  encryptedKey: string; // AES key encrypted with recipient's public key
  iv: string; // Initialization vector for AES
}

// API Response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Connection status
export interface ConnectionStatus {
  isConnected: boolean;
  partnerId?: string;
  partnerEmail?: string;
  connectionId?: string;
}

// Invite Request System
export interface InviteRequest {
  id: string;
  senderId: string;
  senderEmail: string;
  senderUsername?: string;
  receiverId: string;
  code: string;
  timestamp: string;
  status: 'pending' | 'accepted' | 'rejected';
  expiresAt: string;
}

export interface SendInviteRequest {
  code: string;
  receiverId?: string;
  receiverEmail?: string;
}

export interface SendInviteResponse {
  success: boolean;
  requestId?: string;
  message?: string;
}

export interface InviteRequestResponse {
  requestId: string;
  response: 'accept' | 'reject';
}

export interface InviteRequestResponseResult {
  success: boolean;
  message?: string;
  contactInfo?: {
    id: string;
    email: string;
    username?: string;
  };
}

export interface InviteNotification {
  id: string;
  type: 'invite_request' | 'invite_accepted' | 'invite_rejected';
  senderId: string;
  senderEmail: string;
  senderUsername?: string;
  timestamp: string;
  requestId?: string;
  message?: string;
}

// Demo response (keep existing)
export interface DemoResponse {
  message: string;
}
