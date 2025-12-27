import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { ContactProvider, useContacts } from '../contexts/ContactContext';
import { InviteRequest, InviteNotification } from '@shared/api';
import Auth from './Auth';
import Pairing from './Pairing';
import Chat from './Chat';
import ContactsList from './ContactsList';
import GroupChat from './GroupChat';
import { Loader2, MessageCircle, Shield, Wifi, Users } from 'lucide-react';
import { ConnectionStatus } from '@shared/api';
import { motion, AnimatePresence } from 'framer-motion';

type AppState = 'auth' | 'contacts' | 'pairing' | 'chat' | 'group-chat';

interface Contact {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  unreadCount?: number;
  isTyping?: boolean;
  isFavorite?: boolean;
  isPinned?: boolean;
  tags?: string[];
  lastMessage?: {
    content: string;
    timestamp: string;
    isOwn: boolean;
  };
}

interface GroupMember {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  isOnline: boolean;
  isTyping?: boolean;
  role: 'admin' | 'member';
  joinedAt: string;
  lastSeen?: string;
}

interface GroupInfo {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: string;
  members: GroupMember[];
  settings: {
    allowMemberInvites: boolean;
    requireAdminApproval: boolean;
    allowMemberMessages: boolean;
    encryptionLevel: 'standard' | 'enhanced';
  };
}

export default function Index() {
  const { isAuthenticated, isLoading, token, user } = useAuth();
  const { addInviteRequest, addInviteNotification } = useContacts();
  const [appState, setAppState] = useState<AppState>('auth');
  const [partner, setPartner] = useState<Contact | null>(null);
  const [currentGroup, setCurrentGroup] = useState<GroupInfo | null>(null);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [connectionStats, setConnectionStats] = useState({
    totalContacts: 0,
    onlineContacts: 0,
    activeGroups: 0,
    unreadMessages: 0
  });

  // Check connection status when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      checkConnectionStatus();
      loadUserData();
    }
  }, [isAuthenticated, token]);

  const checkConnectionStatus = async () => {
    setIsCheckingConnection(true);
    try {
      const response = await fetch('/api/pairing/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const status: ConnectionStatus = await response.json();
        
        if (status.isConnected && status.partnerEmail) {
          // Convert to Contact format
          const partnerContact: Contact = {
            id: status.partnerId!,
            email: status.partnerEmail,
            isOnline: true,
            status: 'online'
          };
          setPartner(partnerContact);
          setAppState('chat');
        } else {
          setAppState('contacts');
        }
      } else {
        setAppState('contacts');
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      setAppState('contacts');
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const loadUserData = async () => {
    // Mock loading user statistics
    // In a real app, this would fetch from API
    setTimeout(() => {
      setConnectionStats({
        totalContacts: 12,
        onlineContacts: 7,
        activeGroups: 3,
        unreadMessages: 5
      });
    }, 1000);
  };

  const handleSelectContact = (contact: Contact) => {
    setPartner(contact);
    setAppState('chat');
  };

  const handleCreateGroup = (contacts: Contact[]) => {
    // Create a new group with selected contacts
    const newGroup: GroupInfo = {
      id: `group-${Date.now()}`,
      name: `Group with ${contacts.map(c => c.username || c.email).join(', ')}`,
      description: 'New group chat',
      isPrivate: false,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || '',
      members: [
        // Add current user as admin
        {
          id: user?.id || '',
          email: user?.email || '',
          username: user?.username,
          isOnline: true,
          role: 'admin' as const,
          joinedAt: new Date().toISOString()
        },
        // Add selected contacts as members
        ...contacts.map(contact => ({
          id: contact.id,
          email: contact.email,
          username: contact.username,
          isOnline: contact.isOnline,
          role: 'member' as const,
          joinedAt: new Date().toISOString(),
          lastSeen: contact.lastSeen
        }))
      ],
      settings: {
        allowMemberInvites: true,
        requireAdminApproval: false,
        allowMemberMessages: true,
        encryptionLevel: 'enhanced'
      }
    };

    setCurrentGroup(newGroup);
    setAppState('group-chat');
  };

  const handleBackToContacts = () => {
    setPartner(null);
    setCurrentGroup(null);
    setAppState('contacts');
  };

  const handleDisconnect = () => {
    setPartner(null);
    setCurrentGroup(null);
    setAppState('contacts');
  };

  const handleBackToAuth = () => {
    setAppState('auth');
  };

  const handleUpdateGroup = (updatedGroup: GroupInfo) => {
    setCurrentGroup(updatedGroup);
  };

  const handleInviteRequest = (request: InviteRequest) => {
    console.log('📨 Received invite request in Index:', request);
    addInviteRequest(request);
  };

  const handleInviteResponse = (notification: InviteNotification) => {
    console.log('📨 Received invite response in Index:', notification);
    addInviteNotification(notification);
  };

  // Enhanced loading screen with stats
  if (isLoading || isCheckingConnection) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-600 via-purple-600 to-blue-700 flex items-center justify-center relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 pointer-events-none">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-32 h-32 rounded-full bg-white/5 backdrop-blur-sm"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`
              }}
              animate={{
                x: [0, 30, 0],
                y: [0, -30, 0],
                opacity: [0.3, 0.6, 0.3],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 8 + i * 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>

        <motion.div 
          className="glass bg-white/10 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/20 shadow-2xl relative overflow-hidden max-w-md w-full mx-4"
          initial={{ opacity: 0, scale: 0.8, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, type: "spring", bounce: 0.3 }}
        >
          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
            animate={{
              x: [-100, 100],
              opacity: [0, 1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
          
          <div className="relative z-10">
            {/* Header */}
            <div className="text-center mb-6">
              <motion.div 
                className="w-16 h-16 bg-gradient-to-br from-white/20 to-white/10 backdrop-blur-xl rounded-[2rem] flex items-center justify-center mx-auto mb-4 border border-white/30"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <MessageCircle className="w-8 h-8 text-white" />
              </motion.div>
              <h2 className="text-2xl font-bold text-white mb-2">SecureChat</h2>
              <p className="text-white/70">Initializing secure connection...</p>
            </div>

            {/* Loading indicator */}
            <div className="flex items-center justify-center space-x-3 text-white mb-6">
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-lg">Loading</span>
            </div>

            {/* Stats preview */}
            {connectionStats.totalContacts > 0 && (
              <motion.div 
                className="grid grid-cols-2 gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <div className="bg-white/10 rounded-[1.5rem] p-3 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center text-blue-400 mb-1">
                    <Users className="w-4 h-4 mr-1" />
                    <span className="font-bold">{connectionStats.totalContacts}</span>
                  </div>
                  <p className="text-white/70 text-xs">Contacts</p>
                </div>
                <div className="bg-white/10 rounded-[1.5rem] p-3 text-center backdrop-blur-sm">
                  <div className="flex items-center justify-center text-green-400 mb-1">
                    <Wifi className="w-4 h-4 mr-1" />
                    <span className="font-bold">{connectionStats.onlineContacts}</span>
                  </div>
                  <p className="text-white/70 text-xs">Online</p>
                </div>
              </motion.div>
            )}

            {/* Security badge */}
            <motion.div 
              className="mt-6 flex items-center justify-center space-x-2 text-green-300"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Shield className="w-4 h-4" />
              <span className="text-sm font-medium">End-to-End Encrypted</span>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show authentication if not logged in
  if (!isAuthenticated) {
    return <Auth />;
  }

  return (
    <AnimatePresence mode="wait">
      {appState === 'contacts' && (
        <motion.div
          key="contacts"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
        >
          <ContactsList
            onSelectContact={handleSelectContact}
            onCreateGroup={handleCreateGroup}
            onBack={handleBackToAuth}
          />
        </motion.div>
      )}

      {appState === 'pairing' && (
        <motion.div
          key="pairing"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
        >
          <SocketProvider
            onInviteRequest={handleInviteRequest}
            onInviteResponse={handleInviteResponse}
          >
            <Pairing onPaired={(partnerInfo) => {
              const contact: Contact = {
                id: partnerInfo.id,
                email: partnerInfo.email,
                isOnline: true,
                status: 'online'
              };
              handleSelectContact(contact);
            }} />
          </SocketProvider>
        </motion.div>
      )}

      {appState === 'chat' && partner && (
        <motion.div
          key="chat"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
        >
          <SocketProvider
            onInviteRequest={handleInviteRequest}
            onInviteResponse={handleInviteResponse}
          >
            <Chat partner={partner} onDisconnect={handleDisconnect} />
          </SocketProvider>
        </motion.div>
      )}

      {appState === 'group-chat' && currentGroup && (
        <motion.div
          key="group-chat"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 50 }}
          transition={{ duration: 0.3 }}
        >
          <SocketProvider
            onInviteRequest={handleInviteRequest}
            onInviteResponse={handleInviteResponse}
          >
            <GroupChat
              group={currentGroup}
              onBack={handleBackToContacts}
              onUpdateGroup={handleUpdateGroup}
            />
          </SocketProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
