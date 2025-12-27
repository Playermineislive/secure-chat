import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { generateSecureCode, generateInviteCode, InviteCode } from '../utils/groupCrypto';
import { InviteRequest, InviteNotification } from '@shared/api';

export interface Contact {
  id: string;
  email: string;
  username?: string;
  displayName?: string; // Custom name set by user
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
  displayName?: string; // Custom name set by user
  description?: string;
  avatar?: string;
  isPrivate: boolean;
  createdAt: string;
  createdBy: string;
  members: GroupMember[];
  admins: string[]; // Array of user IDs who are admins
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
  inviteRequests: InviteRequest[];
  inviteNotifications: InviteNotification[];
  currentInviteCode: InviteCode | null;
  userProfile: {
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  } | null;
  addContact: (contact: Contact) => void;
  removeContact: (contactId: string) => void;
  updateContact: (contactId: string, updates: Partial<Contact>) => void;
  renameContact: (contactId: string, newName: string) => void;
  updateUserProfile: (updates: { username?: string; avatar?: string }) => void;
  createGroup: (name: string, members: Contact[]) => Group;
  updateGroup: (groupId: string, updates: Partial<Group>) => void;
  renameGroup: (groupId: string, newName: string) => void;
  addGroupAdmin: (groupId: string, userId: string) => void;
  removeGroupAdmin: (groupId: string, userId: string) => void;
  removeGroupMember: (groupId: string, userId: string) => void;
  updateGroupSettings: (groupId: string, settings: Partial<Group['settings']>) => void;
  generateNewInviteCode: () => void;
  forceRefreshInviteCode: () => void; // Instant refresh button
  addFriendByCode: (code: string, userInfo: { email: string; username?: string }) => Promise<boolean>;
  sendInviteByCode: (code: string) => Promise<boolean>;
  acceptInviteRequest: (requestId: string) => Promise<boolean>;
  rejectInviteRequest: (requestId: string) => Promise<boolean>;
  addInviteRequest: (request: InviteRequest) => void;
  addInviteNotification: (notification: InviteNotification) => void;
  clearNotification: (notificationId: string) => void;
  searchContacts: (query: string) => Contact[];
  getFavoriteContacts: () => Contact[];
  getOnlineContacts: () => Contact[];
  getRecentContacts: () => Contact[];
  sendFriendRequest: (email: string) => Promise<boolean>;
  acceptFriendRequest: (contactId: string) => void;
  rejectFriendRequest: (contactId: string) => void;
  uploadProfilePicture: (file: File) => Promise<string | null>;
  isLoading: boolean;
  error: string | null;
}

const ContactContext = createContext<ContactContextType | undefined>(undefined);

interface ContactProviderProps {
  children: ReactNode;
}

export const ContactProvider: React.FC<ContactProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Contact[]>([]);
  const [inviteRequests, setInviteRequests] = useState<InviteRequest[]>([]);
  const [inviteNotifications, setInviteNotifications] = useState<InviteNotification[]>([]);
  const [currentInviteCode, setCurrentInviteCode] = useState<InviteCode | null>(null);
  const [userProfile, setUserProfile] = useState<{
    id: string;
    email: string;
    username?: string;
    avatar?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize invite code and load saved data
  useEffect(() => {
    if (user) {
      setUserProfile({
        id: user.id,
        email: user.email,
        username: user.username || user.email.split('@')[0],
        avatar: undefined
      });
      loadSavedData();
      generateInitialInviteCode();
      startInviteCodeRotation();
    }
  }, [user]);

  const loadSavedData = () => {
    try {
      const savedContacts = localStorage.getItem('secureChat_contacts');
      const savedGroups = localStorage.getItem('secureChat_groups');
      const savedRequests = localStorage.getItem('secureChat_pendingRequests');
      const savedInviteRequests = localStorage.getItem('secureChat_inviteRequests');
      const savedInviteNotifications = localStorage.getItem('secureChat_inviteNotifications');
      const savedProfile = localStorage.getItem('secureChat_userProfile');

      if (savedContacts) {
        setContacts(JSON.parse(savedContacts));
      }
      if (savedGroups) {
        setGroups(JSON.parse(savedGroups));
      }
      if (savedRequests) {
        setPendingRequests(JSON.parse(savedRequests));
      }
      if (savedInviteRequests) {
        setInviteRequests(JSON.parse(savedInviteRequests));
      }
      if (savedInviteNotifications) {
        setInviteNotifications(JSON.parse(savedInviteNotifications));
      }
      if (savedProfile && user) {
        const profile = JSON.parse(savedProfile);
        setUserProfile({
          ...profile,
          id: user.id,
          email: user.email
        });
      }
    } catch (error) {
      console.error('Failed to load saved data:', error);
    }
  };

  const saveData = () => {
    try {
      localStorage.setItem('secureChat_contacts', JSON.stringify(contacts));
      localStorage.setItem('secureChat_groups', JSON.stringify(groups));
      localStorage.setItem('secureChat_pendingRequests', JSON.stringify(pendingRequests));
      localStorage.setItem('secureChat_inviteRequests', JSON.stringify(inviteRequests));
      localStorage.setItem('secureChat_inviteNotifications', JSON.stringify(inviteNotifications));
      if (userProfile) {
        localStorage.setItem('secureChat_userProfile', JSON.stringify(userProfile));
      }
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  };

  // Save data whenever it changes
  useEffect(() => {
    saveData();
  }, [contacts, groups, pendingRequests, inviteRequests, inviteNotifications, userProfile]);

  // Polling for invite requests
  useEffect(() => {
    if (!user) return;

    const pollInviteRequests = async () => {
      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          console.log('No auth token found for polling invite requests');
          return;
        }

        console.log('Polling for invite requests...');
        const response = await fetch('/api/invites', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('Poll response:', data);

          if (data.success && data.requests) {
            console.log(`Found ${data.requests.length} pending invite requests`);

            // Convert server requests to our format
            const notifications = data.requests.map((req: any) => ({
              id: req.id,
              type: 'invite_request',
              senderId: req.senderId,
              senderEmail: req.senderEmail,
              senderUsername: req.senderUsername,
              timestamp: req.timestamp,
              message: `${req.senderEmail} wants to connect with you`,
              requestId: req.id
            }));

            // Update notifications if there are new ones
            setInviteNotifications(prev => {
              const existing = new Set(prev.map(n => n.id));
              const newNotifications = notifications.filter((n: any) => !existing.has(n.id));
              if (newNotifications.length > 0) {
                console.log(`Adding ${newNotifications.length} new invite notifications`);
              }
              return newNotifications.length > 0 ? [...prev, ...newNotifications] : prev;
            });
          }
        } else {
          console.error('Failed to poll invite requests:', response.status, response.statusText);
        }
      } catch (error) {
        console.error('Failed to poll invite requests:', error);
      }
    };

    // Poll immediately and then every 10 seconds
    pollInviteRequests();
    const interval = setInterval(pollInviteRequests, 10000);

    return () => clearInterval(interval);
  }, [user]);

  const generateInitialInviteCode = async () => {
    if (!user) return;

    const savedCode = localStorage.getItem('secureChat_inviteCode');
    const savedCodeDate = localStorage.getItem('secureChat_inviteCodeDate');

    // Check if saved code is still valid (less than 24 hours old)
    if (savedCode && savedCodeDate) {
      const codeDate = new Date(savedCodeDate);
      const now = new Date();
      const hoursDiff = (now.getTime() - codeDate.getTime()) / (1000 * 60 * 60);

      if (hoursDiff < 24) {
        try {
          const parsedCode = JSON.parse(savedCode);
          setCurrentInviteCode(parsedCode);

          // Re-register with server in case it was restarted
          const token = localStorage.getItem('authToken');
          if (token) {
            try {
              await fetch('/api/invites/register-code', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ code: parsedCode.code })
              });
            } catch (error) {
              console.error('Failed to re-register existing code:', error);
            }
          }
          return;
        } catch (error) {
          console.error('Invalid saved code:', error);
        }
      }
    }

    // Generate new code if no valid saved code
    await generateNewInviteCode();
  };

  const generateNewInviteCode = async () => {
    if (!user) return;

    const newCode = generateInviteCode('friend', user.id, {
      expiresInHours: 24,
      maxUses: 50
    });

    setCurrentInviteCode(newCode);
    localStorage.setItem('secureChat_inviteCode', JSON.stringify(newCode));
    localStorage.setItem('secureChat_inviteCodeDate', new Date().toISOString());

    // Register the code with the server
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        await fetch('/api/invites/register-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ code: newCode.code })
        });
        console.log('Invite code registered with server:', newCode.code);
      }
    } catch (error) {
      console.error('Failed to register invite code with server:', error);
    }
  };

  const forceRefreshInviteCode = () => {
    // Instantly generate new code regardless of time
    generateNewInviteCode();
  };

  const startInviteCodeRotation = () => {
    // Rotate invite code every 24 hours
    const interval = setInterval(() => {
      generateNewInviteCode();
    }, 24 * 60 * 60 * 1000); // 24 hours

    return () => clearInterval(interval);
  };

  const addContact = (contact: Contact) => {
    setContacts(prev => {
      const exists = prev.find(c => c.id === contact.id || c.email === contact.email);
      if (exists) {
        return prev.map(c => c.id === contact.id ? { ...c, ...contact } : c);
      }
      return [...prev, { ...contact, connectionDate: new Date().toISOString() }];
    });
  };

  const removeContact = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    setGroups(prev => prev.map(group => ({
      ...group,
      members: group.members.filter(m => m.id !== contactId)
    })));
  };

  const updateContact = (contactId: string, updates: Partial<Contact>) => {
    setContacts(prev => prev.map(contact =>
      contact.id === contactId ? { ...contact, ...updates } : contact
    ));
  };

  const renameContact = (contactId: string, newName: string) => {
    setContacts(prev => prev.map(contact =>
      contact.id === contactId ? { ...contact, displayName: newName.trim() } : contact
    ));
  };

  const updateUserProfile = (updates: { username?: string; avatar?: string }) => {
    if (userProfile) {
      const updatedProfile = { ...userProfile, ...updates };
      setUserProfile(updatedProfile);
    }
  };

  const createGroup = (name: string, members: Contact[]): Group => {
    const currentUserId = user?.id || '';
    const newGroup: Group = {
      id: `group_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      description: `Group chat with ${members.length + 1} members`,
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
        // Add current user as admin
        {
          id: currentUserId,
          email: user?.email || '',
          username: userProfile?.username || user?.email || '',
          avatar: userProfile?.avatar,
          isOnline: true,
          status: 'online' as const,
          connectionDate: new Date().toISOString(),
          role: 'admin',
          joinedAt: new Date().toISOString(),
          permissions: {
            canInvite: true,
            canRemoveMembers: true,
            canEditGroup: true,
            canDeleteMessages: true
          }
        },
        // Add selected members
        ...members.map(member => ({
          ...member,
          role: 'member' as const,
          joinedAt: new Date().toISOString(),
          permissions: {
            canInvite: true,
            canRemoveMembers: false,
            canEditGroup: false,
            canDeleteMessages: false
          }
        }))
      ],
      unreadCount: 0
    };

    setGroups(prev => [...prev, newGroup]);
    return newGroup;
  };

  const updateGroup = (groupId: string, updates: Partial<Group>) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, ...updates } : group
    ));
  };

  const renameGroup = (groupId: string, newName: string) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId ? { ...group, displayName: newName.trim() } : group
    ));
  };

  const addGroupAdmin = (groupId: string, userId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedAdmins = [...group.admins];
        if (!updatedAdmins.includes(userId)) {
          updatedAdmins.push(userId);
        }

        const updatedMembers = group.members.map(member =>
          member.id === userId
            ? {
                ...member,
                role: 'admin' as const,
                permissions: {
                  canInvite: true,
                  canRemoveMembers: true,
                  canEditGroup: true,
                  canDeleteMessages: true
                }
              }
            : member
        );

        return { ...group, admins: updatedAdmins, members: updatedMembers };
      }
      return group;
    }));
  };

  const removeGroupAdmin = (groupId: string, userId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId && group.createdBy !== userId) { // Can't remove creator
        const updatedAdmins = group.admins.filter(id => id !== userId);

        const updatedMembers = group.members.map(member =>
          member.id === userId
            ? {
                ...member,
                role: 'member' as const,
                permissions: {
                  canInvite: group.settings.allowMemberInvites,
                  canRemoveMembers: false,
                  canEditGroup: false,
                  canDeleteMessages: false
                }
              }
            : member
        );

        return { ...group, admins: updatedAdmins, members: updatedMembers };
      }
      return group;
    }));
  };

  const removeGroupMember = (groupId: string, userId: string) => {
    setGroups(prev => prev.map(group => {
      if (group.id === groupId) {
        const updatedMembers = group.members.filter(member => member.id !== userId);
        const updatedAdmins = group.admins.filter(id => id !== userId);
        return { ...group, members: updatedMembers, admins: updatedAdmins };
      }
      return group;
    }));
  };

  const updateGroupSettings = (groupId: string, settings: Partial<Group['settings']>) => {
    setGroups(prev => prev.map(group =>
      group.id === groupId
        ? { ...group, settings: { ...group.settings, ...settings } }
        : group
    ));
  };

  const addFriendByCode = async (code: string, userInfo: { email: string; username?: string }): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate code format
      if (!/^[A-Z0-9]{6,12}$/.test(code)) {
        setError('Invalid code format');
        return false;
      }

      // Check if user already exists
      const existingContact = contacts.find(c => c.email === userInfo.email);
      if (existingContact) {
        setError('This user is already in your contacts');
        return false;
      }

      // In a real app, this would make an API call to validate the code
      // For now, we'll simulate a successful addition
      const newContact: Contact = {
        id: `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email: userInfo.email,
        username: userInfo.username || userInfo.email.split('@')[0],
        isOnline: Math.random() > 0.5, // Random online status for demo
        status: 'online',
        connectionDate: new Date().toISOString(),
        unreadCount: 0,
        isFavorite: false,
        isPinned: false,
        tags: ['new']
      };

      addContact(newContact);
      return true;
    } catch (error) {
      console.error('Failed to add friend:', error);
      setError('Failed to add friend. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendFriendRequest = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('Invalid email address');
        return false;
      }

      // Check if user already exists
      const existingContact = contacts.find(c => c.email === email);
      if (existingContact) {
        setError('This user is already in your contacts');
        return false;
      }

      // Check if request already sent
      const existingRequest = pendingRequests.find(r => r.email === email);
      if (existingRequest) {
        setError('Friend request already sent');
        return false;
      }

      // In a real app, this would send a request to the server
      // For demo purposes, we'll simulate a pending request
      const pendingContact: Contact = {
        id: `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        email,
        username: email.split('@')[0],
        isOnline: false,
        status: 'offline',
        connectionDate: new Date().toISOString(),
        unreadCount: 0
      };

      setPendingRequests(prev => [...prev, pendingContact]);
      return true;
    } catch (error) {
      console.error('Failed to send friend request:', error);
      setError('Failed to send friend request. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptFriendRequest = (contactId: string) => {
    const request = pendingRequests.find(r => r.id === contactId);
    if (request) {
      addContact({ ...request, isOnline: true, status: 'online' });
      setPendingRequests(prev => prev.filter(r => r.id !== contactId));
    }
  };

  const rejectFriendRequest = (contactId: string) => {
    setPendingRequests(prev => prev.filter(r => r.id !== contactId));
  };

  const searchContacts = (query: string): Contact[] => {
    if (!query.trim()) return contacts;
    
    const lowerQuery = query.toLowerCase();
    return contacts.filter(contact => 
      contact.email.toLowerCase().includes(lowerQuery) ||
      contact.username?.toLowerCase().includes(lowerQuery) ||
      contact.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  };

  const getFavoriteContacts = (): Contact[] => {
    return contacts.filter(contact => contact.isFavorite);
  };

  const getOnlineContacts = (): Contact[] => {
    return contacts.filter(contact => contact.isOnline);
  };

  const getRecentContacts = (): Contact[] => {
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    return contacts.filter(contact =>
      contact.lastMessage &&
      new Date(contact.lastMessage.timestamp) > oneDayAgo
    ).sort((a, b) => {
      const aTime = a.lastMessage ? new Date(a.lastMessage.timestamp).getTime() : 0;
      const bTime = b.lastMessage ? new Date(b.lastMessage.timestamp).getTime() : 0;
      return bTime - aTime;
    });
  };

  const uploadProfilePicture = async (file: File): Promise<string | null> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return null;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return null;
      }

      // Convert to base64 for storage
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Update user profile with new avatar
      updateUserProfile({ avatar: base64 });

      return base64;
    } catch (error) {
      console.error('Failed to upload profile picture:', error);
      setError('Failed to upload profile picture');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const sendInviteByCode = async (code: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Validate code format
      if (!/^[A-Z0-9]{6,12}$/.test(code)) {
        setError('Invalid code format');
        return false;
      }

      // Check if user has valid auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Please log in to send invite requests');
        return false;
      }

      // Send invite request to server
      const response = await fetch('/api/invites/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
      });

      const result = await response.json();

      if (result.success) {
        // Add notification that request was sent
        const notification: InviteNotification = {
          id: `notification_${Date.now()}`,
          type: 'invite_request',
          senderId: user?.id || '',
          senderEmail: user?.email || '',
          senderUsername: userProfile?.username,
          timestamp: new Date().toISOString(),
          message: 'Invite request sent! Waiting for response...'
        };

        addInviteNotification(notification);
        return true;
      } else {
        setError(result.message || 'Failed to send invite request');
        return false;
      }
    } catch (error) {
      console.error('Failed to send invite request:', error);
      setError('Failed to send invite request. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const acceptInviteRequest = async (requestId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const request = inviteRequests.find(r => r.id === requestId);
      if (!request) {
        setError('Invite request not found');
        return false;
      }

      // Check if user has valid auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Please log in to respond to invite requests');
        return false;
      }

      // Send response to server
      const response = await fetch('/api/invites/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, response: 'accept' })
      });

      const result = await response.json();

      if (result.success) {
        // Remove request from pending
        setInviteRequests(prev => prev.filter(r => r.id !== requestId));

        // Add contact if contact info provided
        if (result.contactInfo) {
          const newContact: Contact = {
            id: result.contactInfo.id,
            email: result.contactInfo.email,
            username: result.contactInfo.username || result.contactInfo.email.split('@')[0],
            isOnline: true,
            status: 'online',
            connectionDate: new Date().toISOString(),
            unreadCount: 0,
            isFavorite: false,
            isPinned: false,
            tags: ['new']
          };

          addContact(newContact);
        }

        // Add success notification
        const notification: InviteNotification = {
          id: `notification_${Date.now()}`,
          type: 'invite_accepted',
          senderId: request.senderId,
          senderEmail: request.senderEmail,
          senderUsername: request.senderUsername,
          timestamp: new Date().toISOString(),
          message: `You are now connected with ${request.senderUsername || request.senderEmail}!`
        };

        addInviteNotification(notification);
        return true;
      } else {
        setError(result.message || 'Failed to accept invite request');
        return false;
      }
    } catch (error) {
      console.error('Failed to accept invite request:', error);
      setError('Failed to accept invite request. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const rejectInviteRequest = async (requestId: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      const request = inviteRequests.find(r => r.id === requestId);
      if (!request) {
        setError('Invite request not found');
        return false;
      }

      // Check if user has valid auth token
      const token = localStorage.getItem('authToken');
      if (!token) {
        setError('Please log in to respond to invite requests');
        return false;
      }

      // Send response to server
      const response = await fetch('/api/invites/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ requestId, response: 'reject' })
      });

      const result = await response.json();

      if (result.success) {
        // Remove request from pending
        setInviteRequests(prev => prev.filter(r => r.id !== requestId));

        // Add rejection notification
        const notification: InviteNotification = {
          id: `notification_${Date.now()}`,
          type: 'invite_rejected',
          senderId: request.senderId,
          senderEmail: request.senderEmail,
          senderUsername: request.senderUsername,
          timestamp: new Date().toISOString(),
          message: `Declined invite request from ${request.senderUsername || request.senderEmail}`
        };

        addInviteNotification(notification);
        return true;
      } else {
        setError(result.message || 'Failed to reject invite request');
        return false;
      }
    } catch (error) {
      console.error('Failed to reject invite request:', error);
      setError('Failed to reject invite request. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addInviteRequest = (request: InviteRequest) => {
    setInviteRequests(prev => {
      const exists = prev.find(r => r.id === request.id);
      if (exists) return prev;
      return [...prev, request];
    });
  };

  const addInviteNotification = (notification: InviteNotification) => {
    setInviteNotifications(prev => [...prev, notification]);

    // Auto-remove notification after 10 seconds
    setTimeout(() => {
      clearNotification(notification.id);
    }, 10000);
  };

  const clearNotification = (notificationId: string) => {
    setInviteNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const value: ContactContextType = {
    contacts,
    groups,
    pendingRequests,
    inviteRequests,
    inviteNotifications,
    currentInviteCode,
    userProfile,
    addContact,
    removeContact,
    updateContact,
    renameContact,
    updateUserProfile,
    createGroup,
    updateGroup,
    renameGroup,
    addGroupAdmin,
    removeGroupAdmin,
    removeGroupMember,
    updateGroupSettings,
    generateNewInviteCode,
    forceRefreshInviteCode,
    addFriendByCode,
    sendInviteByCode,
    acceptInviteRequest,
    rejectInviteRequest,
    addInviteRequest,
    addInviteNotification,
    clearNotification,
    searchContacts,
    getFavoriteContacts,
    getOnlineContacts,
    getRecentContacts,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    uploadProfilePicture,
    isLoading,
    error
  };

  return (
    <ContactContext.Provider value={value}>
      {children}
    </ContactContext.Provider>
  );
};

export const useContacts = (): ContactContextType => {
  const context = useContext(ContactContext);
  if (context === undefined) {
    throw new Error('useContacts must be used within a ContactProvider');
  }
  return context;
};
