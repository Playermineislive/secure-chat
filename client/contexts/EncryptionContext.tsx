import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import CryptoJS from 'crypto-js';
import {
  generateKeyPair,
  encryptMessage,
  decryptMessage,
  encryptFile,
  decryptFile,
  KeyPair,
  EncryptedMessage,
  EncryptedFile,
  isValidEncryptedFile,
  cleanEncryptedMessage,
  fileToArrayBuffer,
  createBlobUrl
} from '../utils/crypto';

// --- Types ---
interface EncryptionContextType {
  keyPair: KeyPair | null;
  partnerPublicKey: string | null;
  sharedKey: string | null;
  isKeysGenerated: boolean;
  generateKeys: () => Promise<void>;
  setPartnerPublicKey: (key: string) => void;
  encryptForPartner: (message: string) => EncryptedMessage | null;
  decryptFromPartner: (encryptedMessage: EncryptedMessage) => string | null;
  encryptFileForPartner: (file: File) => Promise<EncryptedFile | null>;
  decryptFileFromPartner: (encryptedFile: EncryptedFile) => Promise<string | null>;
  clearKeys: () => void;
}

const EncryptionContext = createContext<EncryptionContextType | undefined>(undefined);

// --- Provider ---
export const EncryptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [partnerPublicKey, setPartnerPublicKeyState] = useState<string | null>(null);
  const [sharedKey, setSharedKey] = useState<string | null>(null);
  const [isKeysGenerated, setIsKeysGenerated] = useState(false);

  // 1. Initial Load from Storage
  useEffect(() => {
    try {
      const savedKeyPair = localStorage.getItem('encryptionKeyPair');
      const savedPartnerKey = localStorage.getItem('partnerPublicKey');
      const savedSharedKey = localStorage.getItem('sharedEncryptionKey');

      if (savedKeyPair) {
        const parsed = JSON.parse(savedKeyPair);
        setKeyPair(parsed);
        setIsKeysGenerated(true);
      }
      if (savedPartnerKey) setPartnerPublicKeyState(savedPartnerKey);
      if (savedSharedKey) setSharedKey(savedSharedKey);
    } catch (error) {
      console.error('Failed to load crypto state:', error);
      // Fallback: Clear potentially corrupted state
      localStorage.removeItem('encryptionKeyPair');
    }
  }, []);

  // 2. Automatic Shared Key Generation
  useEffect(() => {
    // Only generate if we have both keys
    if (keyPair?.publicKey && partnerPublicKey) {
      const combinedKeys = [keyPair.publicKey, partnerPublicKey].sort().join('');
      const generatedSharedKey = CryptoJS.SHA256(combinedKeys).toString();
      
      // Only update if changed to prevent render loops
      if (generatedSharedKey !== sharedKey) {
        console.log('🔑 Generating new shared session key...');
        setSharedKey(generatedSharedKey);
        localStorage.setItem('sharedEncryptionKey', generatedSharedKey);
      }
    }
  }, [keyPair?.publicKey, partnerPublicKey, sharedKey]);

  // --- Actions ---

  const generateKeys = useCallback(async () => {
    try {
      console.log('Generating new key pair...');
      const newKeyPair = await generateKeyPair();
      setKeyPair(newKeyPair);
      setIsKeysGenerated(true);
      localStorage.setItem('encryptionKeyPair', JSON.stringify(newKeyPair));
    } catch (error) {
      console.error('Key generation failed:', error);
      throw error;
    }
  }, []);

  const setPartnerPublicKey = useCallback((key: string) => {
    if (key !== partnerPublicKey) {
      console.log('🔑 Updating partner public key...');
      setPartnerPublicKeyState(key);
      localStorage.setItem('partnerPublicKey', key);
    }
  }, [partnerPublicKey]);

  const clearKeys = useCallback(() => {
    setKeyPair(null);
    setPartnerPublicKeyState(null);
    setSharedKey(null);
    setIsKeysGenerated(false);
    localStorage.removeItem('encryptionKeyPair');
    localStorage.removeItem('partnerPublicKey');
    localStorage.removeItem('sharedEncryptionKey');
  }, []);

  // --- Cryptographic Operations (Memoized) ---

  const encryptForPartner = useCallback((message: string): EncryptedMessage | null => {
    if (!sharedKey) {
      console.warn('Cannot encrypt: No shared key established');
      return null;
    }
    try {
      return encryptMessage(message, sharedKey);
    } catch (error) {
      console.error('Encryption error:', error);
      return null;
    }
  }, [sharedKey]);

  const decryptFromPartner = useCallback((encryptedMessage: EncryptedMessage): string | null => {
    if (!sharedKey) return null;

    // Validate structure first
    const cleanedMessage = cleanEncryptedMessage(encryptedMessage);
    if (!cleanedMessage) {
      console.error('❌ Malformed encrypted message received');
      return null;
    }

    try {
      return decryptMessage(cleanedMessage, sharedKey);
    } catch (error: any) {
      console.error('❌ Decryption failed:', error.message || error);
      return null; // Return null on failure instead of throwing to prevent UI crashes
    }
  }, [sharedKey]);

  const encryptFileForPartner = useCallback(async (file: File): Promise<EncryptedFile | null> => {
    if (!sharedKey) return null;
    try {
      const arrayBuffer = await fileToArrayBuffer(file);
      return encryptFile(arrayBuffer, file.name, file.type, sharedKey);
    } catch (error) {
      console.error('File encryption error:', error);
      return null;
    }
  }, [sharedKey]);

  const decryptFileFromPartner = useCallback(async (encryptedFile: EncryptedFile): Promise<string | null> => {
    if (!sharedKey) return null;
    if (!isValidEncryptedFile(encryptedFile)) return null;

    try {
      const decryptedData = decryptFile(encryptedFile, sharedKey);
      return createBlobUrl(decryptedData, encryptedFile.fileType);
    } catch (error) {
      console.error('File decryption error:', error);
      return null;
    }
  }, [sharedKey]);

  // --- Context Value ---
  const value = useMemo<EncryptionContextType>(() => ({
    keyPair,
    partnerPublicKey,
    sharedKey,
    isKeysGenerated,
    generateKeys,
    setPartnerPublicKey,
    encryptForPartner,
    decryptFromPartner,
    encryptFileForPartner,
    decryptFileFromPartner,
    clearKeys,
  }), [
    keyPair, 
    partnerPublicKey, 
    sharedKey, 
    isKeysGenerated, 
    generateKeys, 
    setPartnerPublicKey, 
    encryptForPartner, 
    decryptFromPartner, 
    encryptFileForPartner, 
    decryptFileFromPartner, 
    clearKeys
  ]);

  return (
    <EncryptionContext.Provider value={value}>
      {children}
    </EncryptionContext.Provider>
  );
};

export const useEncryption = (): EncryptionContextType => {
  const context = useContext(EncryptionContext);
  if (context === undefined) {
    throw new Error('useEncryption must be used within an EncryptionProvider');
  }
  return context;
};
