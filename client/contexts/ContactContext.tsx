import React, { createContext, useContext, useEffect, useReducer, useCallback, useMemo, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { generateInviteCode, InviteCode } from '../utils/groupCrypto';

// --- Domain Models ---

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
    type: 'text' | 'image' | 'file';
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

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  avatar?: string;
  status?: string;
}

// --- State Definition ---

interface ContactState {
  contacts: Contact[];
  groups: Group[];
  pendingRequests: Contact[];
  currentInviteCode: InviteCode | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
}

type Action =
  | { type: 'INIT_DATA'; payload: Partial<ContactState> }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_CONTACT'; payload: Contact }
  | { type: 'REMOVE_CONTACT'; payload: string }
  | { type: 'UPDATE_CONTACT'; payload: { id: string; updates: Partial<Contact> } }
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROFILE'; payload: Partial<UserProfile> }
  | { type: 'ADD_GROUP'; payload: Group }
  | { type: 'UPDATE_GROUP'; payload: { id: string; updates: Partial<Group> } }
  | { type: 'REMOVE_GROUP'; payload: string }
  | { type: 'SET_INVITE_CODE'; payload: InviteCode }
  | { type: 'ADD_REQUEST'; payload: Contact }
  | { type: 'REMOVE_REQUEST'; payload: string };

const initialState: ContactState = {
  contacts: [],
  groups: [],
  pendingRequests: [],
  currentInviteCode: null,
  userProfile: null,
  isLoading: false,
  error: null,
};

// --- Reducer (The Brain) ---

function contactReducer(state: ContactState, action: Action): ContactState {
  switch (action.type) {
    case 'INIT_DATA':
      return { ...state, ...action.payload, isLoading: false };
    
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'ADD_CONTACT': {
      // Prevent duplicates
      if (state.contacts.some(c => c.id === action.payload.id || c.email === action.payload.email)) {
        return state;
      }
      return { ...state, contacts: [...state.contacts, action.payload] };
    }

    case 'REMOVE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.filter(c => c.id !== action.payload),
        // Also remove from groups if needed (optional logic)
        groups: state.groups.map(g => ({
          ...g,
          members: g.members.filter(m => m.id !== action.payload)
        }))
      };

    case 'UPDATE_CONTACT':
      return {
        ...state,
        contacts: state.contacts.map(c => 
          c.id === action.payload.id ? { ...c, ...action.payload.updates } : c
        )
      };

    case 'SET_PROFILE':
      return { ...state, userProfile: action.payload };

    case 'UPDATE_PROFILE':
      return state.userProfile 
        ? { ...state, userProfile: { ...state.userProfile, ...action.payload } }
        : state;

    case 'ADD_GROUP':
      return { ...state, groups: [...state.groups, action.payload] };

    case 'UPDATE_GROUP':
      return {
        ...state,
        groups: state.groups.map(g => 
          g.id === action.payload.id ? { ...g, ...action.payload.updates } : g
        )
      };

    case 'REMOVE_GROUP':
      return { ...state, groups: state.groups.filter(g => g.id !== action.payload) };

    case 'SET_INVITE_CODE':
      return { ...state, currentInviteCode: action.payload };

    case 'ADD_REQUEST':
      if (state.pendingRequests.some(r => r.email === action.payload.email)) return state;
      return { ...state, pendingRequests: [...state.pendingRequests, action.payload] };

    case 'REMOVE_REQUEST':
      return { ...state, pendingRequests: state.pendingRequests.filter(r => r.id !== action.payload) };

    default:
      return state;
  }
}

// --- Context Definition ---

interface ContactContextType extends ContactState {
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
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

// --- Provider ---

export const ContactProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(contactReducer, initialState);

  // 1. Initialization & Cross-Tab Sync
  useEffect(() => {
    if (!user) return;

    const loadData = () => {
      try {
        const storedContacts = localStorage.getItem('secureChat_contacts');
        const storedGroups = localStorage.getItem('secureChat_groups');
        const storedRequests = localStorage.getItem('secureChat_pendingRequests');
        const storedProfile = localStorage.getItem('secureChat_userProfile');
        
        dispatch({
          type: 'INIT_DATA',
          payload: {
            contacts: storedContacts ? JSON.parse(storedContacts) : [],
            groups: storedGroups ? JSON.parse(storedGroups) : [],
            pendingRequests: storedRequests ? JSON.parse(storedRequests) : [],
            userProfile: storedProfile ? JSON.parse(storedProfile) : {
              id: user.id,
              email: user.email,
              username: user.username || user.email.split('@')[0],
              avatar: undefined
            }
          }
        });
      } catch (e) {
        console.error('Failed to load storage data', e);
      }
    };

    loadData();
    generateInitialInviteCode();

    // Sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('secureChat_')) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user]);

  // 2. Persistence (Debounced)
  useEffect(() => {
    if (!user) return;
    const handler = setTimeout(() => {
      localStorage.setItem('secureChat_contacts', JSON.stringify(state.contacts));
      localStorage.setItem('secureChat_groups', JSON.stringify(state.groups));
      localStorage.setItem('secureChat_pendingRequests', JSON.stringify(state.pendingRequests));
      if (state.userProfile) {
        localStorage.setItem('secureChat_userProfile', JSON.stringify(state.userProfile));
      }
    }, 500); // 500ms debounce
    return () => clearTimeout(handler);
  }, [state.contacts, state.groups, state.pendingRequests, state.userProfile, user]);

  // --- Invite Code System ---

  const generateNewInviteCode = useCallback(() => {
    if (!user) return;
    const newCode = generateInviteCode('friend', user.id, { expiresInHours: 24, maxUses: 50 });
    dispatch({ type: 'SET_INVITE_CODE', payload: newCode });
    localStorage.setItem('secureChat_inviteCode', JSON.stringify(newCode));
    localStorage.setItem('secureChat_inviteCodeDate', new Date().toISOString());
  }, [user]);

  const generateInitialInviteCode = useCallback(() => {
    const savedCode = localStorage.getItem('secureChat_inviteCode');
    const savedCodeDate = localStorage.getItem('secureChat_inviteCodeDate');
    if (savedCode && savedCodeDate) {
      const hoursDiff = (new Date().getTime() - new Date(savedCodeDate).getTime()) / (1000 * 60 * 60);
      if (hoursDiff < 24) {
        try {
          dispatch({ type: 'SET_INVITE_CODE', payload: JSON.parse(savedCode) });
          return;
        } catch {}
      }
    }
    generateNewInviteCode();
  }, [generateNewInviteCode]);

  const forceRefreshInviteCode = useCallback(() => generateNewInviteCode(), [generateNewInviteCode]);

  // --- Actions ---

  const addContact = useCallback((contact: Contact) => 
    dispatch({ type: 'ADD_CONTACT', payload: { ...contact, connectionDate: new Date().toISOString() } }), []);

  const removeContact = useCallback((id: string) => 
    dispatch({ type: 'REMOVE_CONTACT', payload: id }), []);

  const updateContact = useCallback((id: string, updates: Partial<Contact>) => 
    dispatch({ type: 'UPDATE_CONTACT', payload: { id, updates } }), []);

  const renameContact = useCallback((id: string, newName: string) => 
    dispatch({ type: 'UPDATE_CONTACT', payload: { id, updates: { displayName: newName.trim() } } }), []);

  const updateUserProfile = useCallback((updates: Partial<UserProfile>) => 
    dispatch({ type: 'UPDATE_PROFILE', payload: updates }), []);

  // --- Group Logic ---

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
        {
          ...state.userProfile,
          id: currentUserId,
          role: 'admin',
          joinedAt: new Date().toISOString(),
          isOnline: true,
          status: 'online',
          permissions: { canInvite: true, canRemoveMembers: true, canEditGroup: true, canDeleteMessages: true }
        } as GroupMember,
        ...members.map(m => ({
          ...m,
          role: 'member' as const,
          joinedAt: new Date().toISOString(),
          permissions: { canInvite: true, canRemoveMembers: false, canEditGroup: false, canDeleteMessages: false }
        }))
      ],
      unreadCount: 0
    };
    dispatch({ type: 'ADD_GROUP', payload: newGroup });
    return newGroup;
  }, [user, state.userProfile]);

  const updateGroup = useCallback((id: string, updates: Partial<Group>) => 
    dispatch({ type: 'UPDATE_GROUP', payload: { id, updates } }), []);

  const renameGroup = useCallback((id: string, name: string) => 
    dispatch({ type: 'UPDATE_GROUP', payload: { id, updates: { displayName: name } } }), []);

  // Simplified group helpers leveraging updateGroup
  const addGroupAdmin = useCallback((groupId: string, userId: string) => {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;
    const newAdmins = [...group.admins, userId];
    const newMembers = group.members.map(m => m.id === userId ? { ...m, role: 'admin' as const } : m);
    updateGroup(groupId, { admins: newAdmins, members: newMembers });
  }, [state.groups, updateGroup]);

  const removeGroupAdmin = useCallback((groupId: string, userId: string) => {
    const group = state.groups.find(g => g.id === groupId);
    if (!group || group.createdBy === userId) return;
    const newAdmins = group.admins.filter(a => a !== userId);
    const newMembers = group.members.map(m => m.id === userId ? { ...m, role: 'member' as const } : m);
    updateGroup(groupId, { admins: newAdmins, members: newMembers });
  }, [state.groups, updateGroup]);

  const removeGroupMember = useCallback((groupId: string, userId: string) => {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;
    const newMembers = group.members.filter(m => m.id !== userId);
    updateGroup(groupId, { members: newMembers });
  }, [state.groups, updateGroup]);

  const updateGroupSettings = useCallback((groupId: string, settings: Partial<Group['settings']>) => {
    const group = state.groups.find(g => g.id === groupId);
    if (!group) return;
    updateGroup(groupId, { settings: { ...group.settings, ...settings } });
  }, [state.groups, updateGroup]);

  // --- Async Operations ---

  const addFriendByCode = useCallback(async (code: string, userInfo: { email: string; username?: string }) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (!/^[A-Z0-9]{6,12}$/.test(code)) throw new Error('Invalid code format');
      if (state.contacts.some(c => c.email === userInfo.email)) throw new Error('User already in contacts');
      
      // Simulate API
      await new Promise(r => setTimeout(r, 800));
      
      const newContact: Contact = {
        id: `contact_${Date.now()}`,
        email: userInfo.email,
        username: userInfo.username || userInfo.email.split('@')[0],
        isOnline: true,
        status: 'online',
        connectionDate: new Date().toISOString(),
        isFavorite: false,
        isPinned: false
      };
      dispatch({ type: 'ADD_CONTACT', payload: newContact });
      return true;
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.contacts]);

  const sendFriendRequest = useCallback(async (email: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (state.contacts.some(c => c.email === email)) throw new Error('User already added');
      // Simulate API
      await new Promise(r => setTimeout(r, 600));
      dispatch({ type: 'ADD_REQUEST', payload: {
        id: `req_${Date.now()}`, email, username: email.split('@')[0],
        isOnline: false, status: 'offline', connectionDate: new Date().toISOString()
      }});
      return true;
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      return false;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [state.contacts]);

  const acceptFriendRequest = useCallback((id: string) => {
    const req = state.pendingRequests.find(r => r.id === id);
    if (req) {
      dispatch({ type: 'ADD_CONTACT', payload: { ...req, isOnline: true, status: 'online' } });
      dispatch({ type: 'REMOVE_REQUEST', payload: id });
    }
  }, [state.pendingRequests]);

  const rejectFriendRequest = useCallback((id: string) => 
    dispatch({ type: 'REMOVE_REQUEST', payload: id }), []);

  const uploadProfilePicture = useCallback(async (file: File) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('File too large');
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      dispatch({ type: 'UPDATE_PROFILE', payload: { avatar: base64 } });
      return base64;
    } catch (e: any) {
      dispatch({ type: 'SET_ERROR', payload: e.message });
      return null;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  // --- Selectors (Memoized) ---

  const searchContacts = useCallback((query: string) => {
    if (!query) return state.contacts;
    const lower = query.toLowerCase();
    return state.contacts.filter(c => 
      c.email.toLowerCase().includes(lower) || 
      c.username?.toLowerCase().includes(lower) || 
      c.displayName?.toLowerCase().includes(lower)
    );
  }, [state.contacts]);

  const getFavoriteContacts = useCallback(() => state.contacts.filter(c => c.isFavorite), [state.contacts]);
  const getOnlineContacts = useCallback(() => state.contacts.filter(c => c.isOnline), [state.contacts]);
  const getRecentContacts = useCallback(() => {
    return [...state.contacts].sort((a, b) => {
      const timeA = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const timeB = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return timeB - timeA;
    });
  }, [state.contacts]);

  // --- Output Value ---

  const value = useMemo(() => ({
    ...state,
    addContact, removeContact, updateContact, renameContact, updateUserProfile,
    createGroup, updateGroup, renameGroup, addGroupAdmin, removeGroupAdmin, removeGroupMember, updateGroupSettings,
    generateNewInviteCode, forceRefreshInviteCode, addFriendByCode,
    searchContacts, getFavoriteContacts, getOnlineContacts, getRecentContacts,
    sendFriendRequest, acceptFriendRequest, rejectFriendRequest, uploadProfilePicture
  }), [state, addContact, removeContact, updateContact, renameContact, updateUserProfile, createGroup, updateGroup, renameGroup, addGroupAdmin, removeGroupAdmin, removeGroupMember, updateGroupSettings, generateNewInviteCode, forceRefreshInviteCode, addFriendByCode, searchContacts, getFavoriteContacts, getOnlineContacts, getRecentContacts, sendFriendRequest, acceptFriendRequest, rejectFriendRequest, uploadProfilePicture]);

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContacts = () => {
  const context = useContext(ContactContext);
  if (!context) throw new Error('useContacts must be used within ContactProvider');
  return context;
};
