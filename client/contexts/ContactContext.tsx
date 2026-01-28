import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { generateInviteCode, InviteCode } from '../utils/groupCrypto';

// --- Types ---

export interface Contact {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: string;
  status?: 'online' | 'away' | 'busy' | 'offline';
  unreadCount?: number;
  isTyping?: boolean;
  isFavorite?: boolean;
  isPinned?: boolean;
  tags?: string[];
  publicKey?: string;
  connectionDate?: string;
  lastMessage?: {
    content: string;
    timestamp: string;
    isOwn: boolean;
  };
}

export interface GroupMember extends Contact {
  role: 'admin' | 'member';
  joinedAt: string;
  permissions: {
    canInvite: boolean;
    canRemoveMembers: boolean;
    canEditGroup: boolean;
    canDeleteMessages: boolean;
  };
}

export interface Group {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  avatar?: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: string;
  members: GroupMember[];
  admins: string[];
  settings: {
    allowMemberInvites: boolean;
    requireAdminApproval: boolean;
    allowMemberMessages: boolean;
    encryptionLevel: 'standard' | 'enhanced';
    allowNameChange: boolean;
  };
  unreadCount?: number;
  lastMessage?: {
    content: string;
    timestamp: string;
    sender: string;
  };
}

interface ContactContextType {
  contacts: Contact[];
  groups: Group[];
  pendingRequests: Contact[];
  currentInviteCode: InviteCode | null;
  userProfile: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  } | null;
  
  // Actions
  addContact: (contact: Contact) => void;
  removeContact: (contactId: string) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  renameContact: (contactId: string, newName: string) => void;
  updateUserProfile: (updates: { username?: string; avatar?: string }) => void;
  
  // Group Actions
  createGroup: (name: string, members: Contact[]) => Group;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  renameGroup: (groupId: string, newName: string) => void;
  addGroupAdmin: (groupId: string, userId: string) => void;
  removeGroupAdmin: (groupId: string, userId: string) => void;
  removeGroupMember: (groupId: string, userId: string) => void;
  updateGroupSettings: (groupId: string, settings: Partial<Group['settings']>) => void;
  
  // Invite System
  generateNewInviteCode: () => void;
  forceRefreshInviteCode: () => void;
  addFriendByCode: (code: string, userInfo: { email: string; username?: string }) => Promise<boolean>;
  
  // Queries
  searchContacts: (query: string) => Contact[];
  getFavoriteContacts: () => Contact[];
  getOnlineContacts: () => Contact[];
  getRecentContacts: () => Contact[];
  
  // Friend Requests
  sendFriendRequest: (email: string) => Promise<boolean>;
  acceptFriendRequest: (contactId: string) => void;
  rejectFriendRequest: (contactId: string) => void;
  uploadProfilePicture: (file: File) => Promise<string | null>;
  
  // State
  isLoading: boolean;
  error: string | null;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

export const ContactProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  // --- State ---
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Contact[]>([]);
  const [currentInviteCode, setCurrentInviteCode] = useState<InviteCode | null>(null);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Persistence Logic ---

  // Initial Load
  useEffect(() => {
    if (user) {
      // Initialize profile
      const savedProfile = localStorage.getItem('secureChat_userProfile');
      if (savedProfile) {
        setUserProfile({ ...JSON.parse(savedProfile), id: user.id, email: user.email });
      } else {
        setUserProfile({
          id: user.id,
          email: user.email,
          username: user.username || user.email.split('@')[0],
          avatar: undefined
        });
      }

      // Load data
      try {
        const savedContacts = localStorage.getItem('secureChat_contacts');
        const savedGroups = localStorage.getItem('secureChat_groups');
        const savedRequests = localStorage.getItem('secureChat_pendingRequests');
        
        if (savedContacts) setContacts(JSON.parse(savedContacts));
        if (savedGroups) setGroups(JSON.parse(savedGroups));
        if (savedRequests) setPendingRequests(JSON.parse(savedRequests));
      } catch (err) {
        console.error('Failed to load local data', err);
      }

      generateInitialInviteCode();
    }
  }, [user]); // Only run when user changes (login)

  // Debounced Save
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      localStorage.setItem('secureChat_contacts', JSON.stringify(contacts));
      localStorage.setItem('secureChat_groups', JSON.stringify(groups));
      localStorage.setItem('secureChat_pendingRequests', JSON.stringify(pendingRequests));
      if (userProfile) {
        localStorage.setItem('secureChat_userProfile', JSON.stringify(userProfile));
      }
    }, 1000); // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId);
  }, [contacts, groups, pendingRequests, userProfile, user]);

  // --- Invite Code Logic ---

  const generateNewInviteCode = useCallback(() => {
    if (!user) return;
    const newCode = generateInviteCode('friend', user.id, { expiresInHours: 24, maxUses: 50 });
    setCurrentInviteCode(newCode);
    localStorage.setItem('secureChat_inviteCode', JSON.stringify(newCode));
    localStorage.setItem('secureChat_inviteCodeDate', new Date().toISOString());
  }, [user]);

  const generateInitialInviteCode = useCallback(() => {
    const savedCode = localStorage.getItem('secureChat_inviteCode');
    const savedCodeDate = localStorage.getItem('secureChat_inviteCodeDate');
    
    if (savedCode && savedCodeDate) {
      const codeDate = new Date(savedCodeDate);
      const hoursDiff = (new Date().getTime() - codeDate.getTime()) / (1000 * 60 * 60);
      
      if (hoursDiff < 24) {
        try {
          setCurrentInviteCode(JSON.parse(savedCode));
          return;
        } catch { /* ignore invalid JSON */ }
      }
    }
    generateNewInviteCode();
  }, [generateNewInviteCode]);

  const forceRefreshInviteCode = useCallback(() => generateNewInviteCode(), [generateNewInviteCode]);

  // Rotate code periodically
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(generateNewInviteCode, 24 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user, generateNewInviteCode]);

  // --- Contact Actions ---

  const addContact = useCallback((contact: Contact) => {
    setContacts(prev => {
      const exists = prev.some(c => c.id === contact.id || c.email === contact.email);
      if (exists) return prev.map(c => (c.id === contact.id ? { ...c, ...contact } : c));
      return [...prev, { ...contact, connectionDate: new Date().toISOString() }];
    });
  }, []);

  const removeContact = useCallback((contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    setGroups(prev => prev.map(g => ({
      ...g,
      members: g.members.filter(m => m.id !== contactId)
    })));
  }, []);

  const updateContact = useCallback((contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, ...updates } : c)));
  }, []);

  const renameContact = useCallback((contactId: string, newName: string) => {
    if (!newName.trim()) return;
    setContacts(prev => prev.map(c => (c.id === contactId ? { ...c, displayName: newName.trim() } : c)));
  }, []);

  const updateUserProfile = useCallback((updates: { username?: string; avatar?: string }) => {
    setUserProfile(prev => (prev ? { ...prev, ...updates } : null));
  }, []);

  // --- Group Actions ---

  const createGroup = useCallback((name: string, members: Contact[]): Group => {
    const currentUserId = user?.id || '';
    const newGroup: Group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `Group with ${members.length + 1} members`,
      isPrivate: false,
      createdAt: new Date().toISOString(),
      createdBy: currentUserId,
      admins: [currentUserId],
      settings: {
        allowMemberInvites: true,
        requireAdminApproval: false,
        allowMemberMessages: true,
        encryptionLevel: 'enhanced',
        allowNameChange: false
      },
      members: [
        // Admin (Self)
        {
          id: currentUserId,
          email: user?.email || '',
          username: userProfile?.username || user?.email || '',
          avatar: userProfile?.avatar,
          isOnline: true,
          status: 'online',
          connectionDate: new Date().toISOString(),
          role: 'admin',
          joinedAt: new Date().toISOString(),
          permissions: { canInvite: true, canRemoveMembers: true, canEditGroup: true, canDeleteMessages: true }
        } as GroupMember,
        // Other Members
        ...members.map(m => ({
          ...m,
          role: 'member' as const,
          joinedAt: new Date().toISOString(),
          permissions: { canInvite: true, canRemoveMembers: false, canEditGroup: false, canDeleteMessages: false }
        }))
      ],
      unreadCount: 0
    };

    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  }, [user, userProfile]);

  const updateGroup = useCallback((groupId: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, ...updates } : g)));
  }, []);

  const renameGroup = useCallback((groupId: string, newName: string) => {
    if (!newName.trim()) return;
    setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, displayName: newName.trim() } : g)));
  }, []);

  const addGroupAdmin = useCallback((groupId: string, userId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      if (g.admins.includes(userId)) return g;
      
      return {
        ...g,
        admins: [...g.admins, userId],
        members: g.members.map(m => m.id === userId ? { 
          ...m, 
          role: 'admin',
          permissions: { canInvite: true, canRemoveMembers: true, canEditGroup: true, canDeleteMessages: true }
        } : m)
      };
    }));
  }, []);

  const removeGroupAdmin = useCallback((groupId: string, userId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      if (g.createdBy === userId) return g; // Cannot remove creator
      
      return {
        ...g,
        admins: g.admins.filter(id => id !== userId),
        members: g.members.map(m => m.id === userId ? {
          ...m,
          role: 'member',
          permissions: { 
            canInvite: g.settings.allowMemberInvites, 
            canRemoveMembers: false, 
            canEditGroup: false, 
            canDeleteMessages: false 
          }
        } : m)
      };
    }));
  }, []);

  const removeGroupMember = useCallback((groupId: string, userId: string) => {
    setGroups(prev => prev.map(g => {
      if (g.id !== groupId) return g;
      return {
        ...g,
        members: g.members.filter(m => m.id !== userId),
        admins: g.admins.filter(id => id !== userId)
      };
    }));
  }, []);

  const updateGroupSettings = useCallback((groupId: string, settings: Partial<Group['settings']>) => {
    setGroups(prev => prev.map(g => (g.id === groupId ? { ...g, settings: { ...g.settings, ...settings } } : g)));
  }, []);

  // --- Friend Request Logic ---

  const addFriendByCode = useCallback(async (code: string, userInfo: { email: string; username?: string }) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!/^[A-Z0-9]{6,12}$/.test(code)) throw new Error('Invalid code format');
      if (contacts.some(c => c.email === userInfo.email)) throw new Error('User already in contacts');

      // Simulating API call delay
      await new Promise(resolve => setTimeout(resolve, 800));

      const newContact: Contact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        email: userInfo.email,
        username: userInfo.username || userInfo.email.split('@')[0],
        isOnline: true,
        status: 'online',
        connectionDate: new Date().toISOString(),
        unreadCount: 0,
        isFavorite: false,
        isPinned: false,
        tags: ['new']
      };
      
      setContacts(prev => [...prev, newContact]);
      return true;
    } catch (e: any) {
      console.error(e);
      setError(e.message || 'Failed to add friend');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contacts]);

  const sendFriendRequest = useCallback(async (email: string) => {
    setIsLoading(true);
    setError(null);
    try {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Invalid email');
      if (contacts.some(c => c.email === email)) throw new Error('User already in contacts');
      if (pendingRequests.some(r => r.email === email)) throw new Error('Request already sent');

      // Simulating API
      await new Promise(resolve => setTimeout(resolve, 600));

      const pending: Contact = {
        id: `pending_${Date.now()}`,
        email,
        username: email.split('@')[0],
        isOnline: false,
        status: 'offline',
        connectionDate: new Date().toISOString(),
        unreadCount: 0
      };
      setPendingRequests(prev => [...prev, pending]);
      return true;
    } catch (e: any) {
      setError(e.message);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [contacts, pendingRequests]);

  const acceptFriendRequest = useCallback((contactId: string) => {
    const request = pendingRequests.find(r => r.id === contactId);
    if (request) {
      setContacts(prev => [...prev, { ...request, isOnline: true, status: 'online' }]);
      setPendingRequests(prev => prev.filter(r => r.id !== contactId));
    }
  }, [pendingRequests]);

  const rejectFriendRequest = useCallback((contactId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== contactId));
  }, []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setError('Invalid file type'); return null; }
    if (file.size > 5 * 1024 * 1024) { setError('File too large (max 5MB)'); return null; }

    setIsLoading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      setUserProfile(prev => (prev ? { ...prev, avatar: base64 } : null));
      return base64;
    } catch (e) {
      setError('Upload failed');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // --- Getters ---

  const searchContacts = useCallback((query: string) => {
    if (!query.trim()) return contacts;
    const lower = query.toLowerCase();
    return contacts.filter(c => 
      c.email.toLowerCase().includes(lower) || 
      c.username?.toLowerCase().includes(lower) ||
      c.displayName?.toLowerCase().includes(lower) ||
      c.tags?.some(t => t.toLowerCase().includes(lower))
    );
  }, [contacts]);

  const getFavoriteContacts = useCallback(() => contacts.filter(c => c.isFavorite), [contacts]);
  const getOnlineContacts = useCallback(() => contacts.filter(c => c.isOnline), [contacts]);
  
  const getRecentContacts = useCallback(() => {
    const threshold = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h
    return contacts
      .filter(c => c.lastMessage && new Date(c.lastMessage.timestamp) > threshold)
      .sort((a, b) => new Date(b.lastMessage!.timestamp).getTime() - new Date(a.lastMessage!.timestamp).getTime());
  }, [contacts]);

  // --- Context Value Memoization ---
  const value = useMemo<ContactContextType>(() => ({
    contacts, groups, pendingRequests, currentInviteCode, userProfile, isLoading, error,
    addContact, removeContact, updateContact, renameContact, updateUserProfile,
    createGroup, updateGroup, renameGroup, addGroupAdmin, removeGroupAdmin, removeGroupMember, updateGroupSettings,
    generateNewInviteCode, forceRefreshInviteCode, addFriendByCode,
    searchContacts, getFavoriteContacts, getOnlineContacts, getRecentContacts,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, uploadProfilePicture
  }), [
    contacts, groups, pendingRequests, currentInviteCode, userProfile, isLoading, error,
    addContact, removeContact, updateContact, renameContact, updateUserProfile,
    createGroup, updateGroup, renameGroup, addGroupAdmin, removeGroupAdmin, removeGroupMember, updateGroupSettings,
    generateNewInviteCode, forceRefreshInviteCode, addFriendByCode,
    searchContacts, getFavoriteContacts, getOnlineContacts, getRecentContacts,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, uploadProfilePicture
  ]);

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContacts = (): ContactContextType => {
  const context = useContext(ContactContext);
  if (!context) throw new Error('useContacts must be used within a ContactProvider');
  return context;
};
