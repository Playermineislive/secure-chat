import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef, useMemo, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useEncryption } from './EncryptionContext';
import { WebSocketMessage, ChatMessage, MediaContent } from '@shared/api';
import { cleanEncryptedMessage, decryptFromPartner, isValidEncryptedFile, decryptFileFromPartner, EncryptedMessage } from '../utils/crypto';

// --- Domain Models ---

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'unstable';

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'failed';

export interface EnhancedChatMessage extends ChatMessage {
  status: MessageStatus;
  localId?: string; // For tracking optimistic updates
  retryCount?: number;
}

interface SocketState {
  isConnected: boolean;
  connectionState: ConnectionState;
  messages: EnhancedChatMessage[];
  partnerTyping: boolean;
  partnerOnline: boolean;
  keyExchangeComplete: boolean;
  unsentQueue: Array<{ id: string; payload: any; type: string; timestamp: number }>;
}

// --- Actions ---

type Action =
  | { type: 'SET_CONNECTION_STATE'; payload: ConnectionState }
  | { type: 'SET_PARTNER_STATUS'; payload: { online?: boolean; typing?: boolean } }
  | { type: 'SET_KEY_EXCHANGE'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: EnhancedChatMessage }
  | { type: 'UPDATE_MESSAGE_STATUS'; payload: { id: string; status: MessageStatus } }
  | { type: 'QUEUE_MESSAGE'; payload: { id: string; payload: any; type: string } }
  | { type: 'REMOVE_FROM_QUEUE'; payload: string }
  | { type: 'LOAD_QUEUE'; payload: any[] }
  | { type: 'CLEAR_MESSAGES' };

// --- Initial State ---

const initialState: SocketState = {
  isConnected: false,
  connectionState: 'disconnected',
  messages: [],
  partnerTyping: false,
  partnerOnline: false,
  keyExchangeComplete: false,
  unsentQueue: [],
};

// --- Reducer ---

function socketReducer(state: SocketState, action: Action): SocketState {
  switch (action.type) {
    case 'SET_CONNECTION_STATE':
      return { 
        ...state, 
        connectionState: action.payload,
        isConnected: action.payload === 'connected' 
      };

    case 'SET_PARTNER_STATUS':
      return { 
        ...state, 
        partnerOnline: action.payload.online ?? state.partnerOnline,
        partnerTyping: action.payload.typing ?? state.partnerTyping
      };

    case 'SET_KEY_EXCHANGE':
      return { ...state, keyExchangeComplete: action.payload };

    case 'ADD_MESSAGE':
      // Deduplication: Check if message ID already exists
      if (state.messages.some(m => m.id === action.payload.id)) return state;
      return { ...state, messages: [...state.messages, action.payload] };

    case 'UPDATE_MESSAGE_STATUS':
      return {
        ...state,
        messages: state.messages.map(msg => 
          msg.id === action.payload.id || msg.localId === action.payload.id 
            ? { ...msg, status: action.payload.status } 
            : msg
        )
      };

    case 'QUEUE_MESSAGE':
      const newQueue = [...state.unsentQueue, { ...action.payload, timestamp: Date.now() }];
      // Persist to storage
      localStorage.setItem('secureChat_unsentQueue', JSON.stringify(newQueue));
      return { ...state, unsentQueue: newQueue };

    case 'REMOVE_FROM_QUEUE': {
      const filteredQueue = state.unsentQueue.filter(item => item.id !== action.payload);
      localStorage.setItem('secureChat_unsentQueue', JSON.stringify(filteredQueue));
      return { ...state, unsentQueue: filteredQueue };
    }

    case 'LOAD_QUEUE':
      return { ...state, unsentQueue: action.payload };

    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };

    default:
      return state;
  }
}

// --- Context ---

interface SocketContextType extends SocketState {
  socket: Socket | null;
  sendMessage: (content: string, type?: string) => Promise<void>;
  sendFile: (file: File) => Promise<void>;
  sendTyping: (isTyping: boolean) => void;
  clearMessages: () => void;
  retryMessage: (localId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

// --- Provider ---

export const SocketProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token, isAuthenticated, user } = useAuth();
  const {
    keyPair,
    partnerPublicKey,
    sharedKey,
    encryptForPartner,
    decryptFromPartner,
    decryptFileFromPartner,
    setPartnerPublicKey,
    generateKeys,
    isKeysGenerated
  } = useEncryption();

  const [state, dispatch] = useReducer(socketReducer, initialState);
  const socketRef = useRef<Socket | null>(null);
  
  // Keep refs for event listeners to avoid stale closures
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // --- Initialization & Lifecycle ---

  // 1. Load persisted queue on mount
  useEffect(() => {
    try {
      const savedQueue = localStorage.getItem('secureChat_unsentQueue');
      if (savedQueue) {
        dispatch({ type: 'LOAD_QUEUE', payload: JSON.parse(savedQueue) });
      }
    } catch (e) {
      console.error('Failed to load message queue', e);
    }
  }, []);

  // 2. Ensure Encryption Keys
  useEffect(() => {
    if (isAuthenticated && !isKeysGenerated) generateKeys();
  }, [isAuthenticated, isKeysGenerated, generateKeys]);

  // 3. Track Key Exchange
  useEffect(() => {
    const isComplete = !!(keyPair && partnerPublicKey && sharedKey);
    if (isComplete !== state.keyExchangeComplete) {
      dispatch({ type: 'SET_KEY_EXCHANGE', payload: isComplete });
    }
  }, [keyPair, partnerPublicKey, sharedKey, state.keyExchangeComplete]);

  // --- Socket Logic ---

  useEffect(() => {
    if (!isAuthenticated || !token || !isKeysGenerated) return;
    if (socketRef.current) return;

    dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connecting' });

    const socket = io('/', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    // --- Connection Events ---

    socket.on('connect', () => {
      console.log('✅ Socket connected');
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'connected' });
      
      // Handshake
      if (user) socket.emit('user_join', { userId: user.id, userEmail: user.email });
      if (keyPair?.publicKey) socket.emit('key_exchange', { publicKey: keyPair.publicKey });

      // Flush Queue
      flushQueue(socket);
    });

    socket.on('disconnect', (reason) => {
      console.warn('❌ Socket disconnected:', reason);
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'disconnected' });
      dispatch({ type: 'SET_PARTNER_STATUS', payload: { online: false, typing: false } });
    });

    socket.on('connect_error', (err) => {
      console.error('⚠️ Connection error:', err);
      dispatch({ type: 'SET_CONNECTION_STATE', payload: 'reconnecting' });
    });

    // --- Chat Events ---

    socket.on('key_exchange', (data: { publicKey: string }) => {
      if (data.publicKey) setPartnerPublicKey(data.publicKey);
    });

    socket.on('user_connected', () => {
      dispatch({ type: 'SET_PARTNER_STATUS', payload: { online: true } });
      // Re-send key to ensure they have it
      if (keyPair?.publicKey) socket.emit('key_exchange', { publicKey: keyPair.publicKey });
    });

    socket.on('user_disconnected', () => {
      dispatch({ type: 'SET_PARTNER_STATUS', payload: { online: false, typing: false } });
    });

    socket.on('typing', (data: { isTyping: boolean }) => {
      dispatch({ type: 'SET_PARTNER_STATUS', payload: { typing: data.isTyping } });
    });

    socket.on('message_ack', (data: { id: string }) => {
      dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { id: data.id, status: 'delivered' } });
    });

    socket.on('message', async (wsMessage: WebSocketMessage) => {
      await handleIncomingMessage(wsMessage);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, token, isKeysGenerated, keyPair]);

  // --- Helper Functions ---

  const flushQueue = useCallback((activeSocket: Socket) => {
    const queue = JSON.parse(localStorage.getItem('secureChat_unsentQueue') || '[]');
    if (queue.length === 0) return;

    console.log(`🚀 Flushing ${queue.length} messages from offline queue...`);
    
    queue.forEach((item: any) => {
      activeSocket.emit('send_message', { 
        content: item.payload, 
        type: item.type,
        clientMessageId: item.id // Pass ID to link ack
      });
      // Mark as sent locally
      dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { id: item.id, status: 'sent' } });
    });

    // Clear queue after attempting flush
    dispatch({ type: 'LOAD_QUEUE', payload: [] });
    localStorage.removeItem('secureChat_unsentQueue');
  }, []);

  const handleIncomingMessage = useCallback(async (wsMessage: WebSocketMessage) => {
    try {
      const { type, data } = wsMessage;
      if (type !== 'message') return;
      if (data.senderId === user?.id) return; // Ignore echo

      let content = data.content;
      
      // Decrypt
      if (data.type === 'text' || data.type === 'emoji') {
        if (typeof content === 'object' && content !== null) {
          const cleaned = cleanEncryptedMessage(content as any);
          if (cleaned) {
            const decrypted = decryptFromPartner(cleaned);
            content = decrypted || '🔒 [Decryption Failed]';
          }
        }
      } else if (['image', 'video', 'file'].includes(data.type)) {
        const media = typeof content === 'string' ? JSON.parse(content) : content;
        if (typeof media.data === 'string' && media.data.startsWith('{')) {
          try {
            const encryptedFile = JSON.parse(media.data);
            if (isValidEncryptedFile(encryptedFile)) {
              const url = await decryptFileFromPartner(encryptedFile);
              media.data = url || '#error';
            }
          } catch { /* ignore */ }
        }
        content = media;
      }

      dispatch({
        type: 'ADD_MESSAGE',
        payload: {
          id: `${data.senderId}-${data.timestamp}`,
          senderId: data.senderId,
          content: content as any,
          timestamp: data.timestamp,
          type: data.type as any,
          status: 'delivered'
        }
      });
    } catch (e) {
      console.error('Error processing incoming message', e);
    }
  }, [user, decryptFromPartner, decryptFileFromPartner]);

  // --- Public Actions ---

  const sendMessage = useCallback(async (content: string, type: string = 'text') => {
    if (!content.trim()) return;

    const tempId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();

    // 1. Optimistic Add
    dispatch({
      type: 'ADD_MESSAGE',
      payload: {
        id: tempId,
        localId: tempId,
        senderId: user?.id || '',
        content,
        timestamp,
        type: type as any,
        status: 'pending'
      }
    });

    // 2. Encrypt
    let payload: any = content;
    if (stateRef.current.keyExchangeComplete && sharedKey && (type === 'text' || type === 'emoji')) {
      const encrypted = encryptForPartner(content);
      if (encrypted) payload = encrypted;
    }

    // 3. Send or Queue
    const messageData = { id: tempId, payload, type };
    
    if (socketRef.current?.connected) {
      socketRef.current.emit('send_message', { 
        content: payload, 
        type, 
        clientMessageId: tempId 
      });
      dispatch({ type: 'UPDATE_MESSAGE_STATUS', payload: { id: tempId, status: 'sent' } });
    } else {
      console.warn('⚠️ Socket offline, queuing message');
      dispatch({ type: 'QUEUE_MESSAGE', payload: messageData });
    }
  }, [user, sharedKey, encryptForPartner]);

  const retryMessage = useCallback((localId: string) => {
    const msg = stateRef.current.messages.find(m => m.id === localId);
    if (msg && msg.status === 'failed') {
      // Re-trigger send logic (simplified for this context)
      if (typeof msg.content === 'string') sendMessage(msg.content, msg.type);
    }
  }, [sendMessage]);

  const sendFile = useCallback(async (file: File) => {
    const reader = new FileReader();
    const fileData = await new Promise<string>((resolve) => {
      reader.onload = () => resolve(reader.result as string);
      reader.readAsDataURL(file);
    });

    const mediaContent = {
      data: fileData, // In a real app, encrypt this first if sharedKey exists
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size
    };

    let type = 'file';
    if (file.type.startsWith('image/')) type = 'image';
    if (file.type.startsWith('video/')) type = 'video';

    await sendMessage(JSON.stringify(mediaContent), type);
  }, [sendMessage]);

  const sendTyping = useCallback((isTyping: boolean) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('typing', { isTyping });
    }
  }, []);

  const clearMessages = useCallback(() => dispatch({ type: 'CLEAR_MESSAGES' }), []);

  // --- Output ---

  const value = useMemo(() => ({
    socket: socketRef.current,
    isConnected: state.isConnected,
    connectionState: state.connectionState,
    messages: state.messages,
    partnerTyping: state.partnerTyping,
    partnerOnline: state.partnerOnline,
    keyExchangeComplete: state.keyExchangeComplete,
    unsentQueue: state.unsentQueue,
    sendMessage,
    sendFile,
    sendTyping,
    clearMessages,
    retryMessage
  }), [state, sendMessage, sendFile, sendTyping, clearMessages, retryMessage]);

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within SocketProvider');
  return context;
};
