import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { SocketProvider } from '../contexts/SocketContext';
import { ContactProvider } from '../contexts/ContactContext';
import Auth from './Auth';
import Pairing from './Pairing';
import Chat from './Chat';
import ContactsList from './ContactsList';
import GroupChat from './GroupChat';
import { Loader2, MessageCircle, ShieldCheck, Wifi, Users, LayoutGrid, MessageSquare } from 'lucide-react';
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
    setTimeout(() => {
      setConnectionStats({
        totalContacts: 12,
        onlineContacts: 7,
        activeGroups: 3,
        unreadMessages: 5
      });
    }, 800);
  };

  const handleSelectContact = (contact: Contact) => {
    setPartner(contact);
    setAppState('chat');
  };

  const handleCreateGroup = (contacts: Contact[]) => {
    const newGroup: GroupInfo = {
      id: `group-${Date.now()}`,
      name: `Group with ${contacts.map(c => c.username || c.email).join(', ')}`,
      description: 'New group chat',
      isPrivate: false,
      createdAt: new Date().toISOString(),
      createdBy: user?.id || '',
      members: [
        {
          id: user?.id || '',
          email: user?.email || '',
          username: user?.username,
          isOnline: true,
          role: 'admin' as const,
          joinedAt: new Date().toISOString()
        },
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

  // --- MATERIAL LOADING SCREEN ---
  if (isLoading || isCheckingConnection) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center font-sans text-slate-900">
        <div className="w-full max-w-sm px-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100 text-center"
          >
            {/* Logo Animation */}
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
              <div className="relative bg-indigo-600 w-16 h-16 rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
                <MessageCircle className="w-8 h-8 text-white" />
              </div>
            </div>

            <h2 className="text-xl font-bold text-slate-800 mb-2">SecureChat</h2>
            <div className="flex items-center justify-center space-x-2 text-indigo-600 mb-6">
               <Loader2 className="w-4 h-4 animate-spin" />
               <span className="text-sm font-medium">Establishing connection...</span>
            </div>

            {/* Stats Grid */}
            {connectionStats.totalContacts > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-center text-slate-700 font-bold text-lg mb-1">
                    <Users className="w-4 h-4 mr-1.5 text-indigo-500" />
                    {connectionStats.totalContacts}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Contacts</div>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-center text-slate-700 font-bold text-lg mb-1">
                    <Wifi className="w-4 h-4 mr-1.5 text-green-500" />
                    {connectionStats.onlineContacts}
                  </div>
                  <div className="text-xs text-slate-400 font-medium">Online</div>
                </div>
              </div>
            )}

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-2 text-slate-400 bg-slate-50 py-2 rounded-lg border border-slate-100">
              <ShieldCheck className="w-4 h-4 text-green-500" />
              <span className="text-xs font-medium">Encrypted & Secure</span>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // Show authentication if not logged in
  if (!isAuthenticated) {
    return <Auth />;
  }

  // Main App Router
  return (
    <div className="bg-[#F0F2F5] min-h-screen">
      <AnimatePresence mode="wait">
        
        {appState === 'contacts' && (
          <motion.div
            key="contacts"
            className="h-full"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
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
            className="h-full"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <SocketProvider>
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
            className="h-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <SocketProvider>
              <Chat partner={partner} onDisconnect={handleDisconnect} onBack={handleBackToContacts} />
            </SocketProvider>
          </motion.div>
        )}

        {appState === 'group-chat' && currentGroup && (
          <motion.div
            key="group-chat"
            className="h-full"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <SocketProvider>
              <GroupChat 
                group={currentGroup} 
                onBack={handleBackToContacts}
                onUpdateGroup={handleUpdateGroup}
              />
            </SocketProvider>
          </motion.div>
        )}
        
      </AnimatePresence>
    </div>
  );
}
