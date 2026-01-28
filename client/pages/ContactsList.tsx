import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useContacts, Contact } from '../contexts/ContactContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import ProfileSettings from '../components/ProfileSettings';
import ContactRename from '../components/ContactRename';
import {
  Users,
  Search,
  Plus,
  MessageCircle,
  UserPlus,
  Copy,
  Check,
  QrCode,
  Star,
  Clock,
  Wifi,
  RefreshCw,
  Settings,
  ArrowLeft,
  MoreVertical,
  Heart,
  Send,
  AlertCircle,
  CheckCircle,
  Edit2,
  X,
  Filter
} from 'lucide-react';

interface ContactsListProps {
  onSelectContact: (contact: Contact) => void;
  onCreateGroup: (contacts: Contact[]) => void;
  onBack: () => void;
}

export default function ContactsList({ onSelectContact, onCreateGroup, onBack }: ContactsListProps) {
  const { user } = useAuth();
  const {
    contacts,
    groups,
    pendingRequests,
    currentInviteCode,
    userProfile,
    generateNewInviteCode,
    addFriendByCode,
    sendFriendRequest,
    searchContacts,
    getFavoriteContacts,
    getOnlineContacts,
    getRecentContacts,
    createGroup,
    renameContact,
    isLoading,
    error
  } = useContacts();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'groups' | 'requests' | 'invites'>('contacts');
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [filterBy, setFilterBy] = useState<'all' | 'online' | 'favorites' | 'recent'>('all');
  const [newFriendEmail, setNewFriendEmail] = useState('');
  const [addFriendCode, setAddFriendCode] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showProfileSettings, setShowProfileSettings] = useState(false);
  const [renamingContact, setRenamingContact] = useState<Contact | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // Filter Logic
  const getFilteredContacts = () => {
    let filtered = contacts;
    if (searchQuery) {
      filtered = searchContacts(searchQuery);
    } else {
      switch (filterBy) {
        case 'online': filtered = getOnlineContacts(); break;
        case 'favorites': filtered = getFavoriteContacts(); break;
        case 'recent': filtered = getRecentContacts(); break;
        default: break;
      }
    }
    return filtered;
  };

  const filteredContacts = getFilteredContacts();

  // Handlers
  const handleSelectContact = (contact: Contact) => {
    if (isSelectionMode) {
      setSelectedContacts(prev =>
        prev.includes(contact.id)
          ? prev.filter(id => id !== contact.id)
          : [...prev, contact.id]
      );
    } else {
      onSelectContact(contact);
    }
  };

  const handleCreateGroup = () => {
    const selectedContactObjects = contacts.filter(c => selectedContacts.includes(c.id));
    if (selectedContactObjects.length >= 1) {
      onCreateGroup(selectedContactObjects);
      setIsSelectionMode(false);
      setSelectedContacts([]);
    }
  };

  const copyInviteCode = async () => {
    if (!currentInviteCode) return;
    try {
      await navigator.clipboard.writeText(currentInviteCode.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (error) { console.error('Failed to copy', error); }
  };

  const handleSendFriendRequest = async () => {
    if (!newFriendEmail.trim()) return;
    const success = await sendFriendRequest(newFriendEmail);
    if (success) {
      setNewFriendEmail('');
      setSuccessMessage('Friend request sent!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowAddFriend(false);
    }
  };

  const handleAddFriendByCode = async () => {
    if (!addFriendCode.trim()) return;
    const success = await addFriendByCode(addFriendCode, {
      email: `user_${addFriendCode}@example.com`,
      username: `User ${addFriendCode}`
    });
    if (success) {
      setAddFriendCode('');
      setSuccessMessage('Friend added!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowAddFriend(false);
    }
  };

  // UI Components
  const TabButton = ({ id, label, icon: Icon, count }: any) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex-1 py-4 text-sm font-medium border-b-2 transition-colors relative ${
        activeTab === id 
          ? 'border-indigo-600 text-indigo-600' 
          : 'border-transparent text-slate-500 hover:text-slate-700'
      }`}
    >
      <div className="flex items-center justify-center space-x-2">
        <Icon className="w-4 h-4" />
        <span>{label}</span>
        {count > 0 && (
          <span className="bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full text-[10px]">
            {count}
          </span>
        )}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] font-sans text-slate-900 relative overflow-hidden">
      
      {/* --- APP BAR --- */}
      <header className="bg-white shadow-sm z-30 sticky top-0">
        
        {/* Top Row: Navigation & Actions */}
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {isSelectionMode ? (
              <button onClick={() => setIsSelectionMode(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <X className="w-6 h-6 text-slate-600" />
              </button>
            ) : (
              <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full">
                <ArrowLeft className="w-6 h-6 text-slate-600" />
              </button>
            )}
            
            <div className="flex flex-col">
              {isSelectionMode ? (
                <>
                  <h1 className="text-lg font-bold text-slate-800">{selectedContacts.length} Selected</h1>
                  <p className="text-xs text-slate-500">Tap to select</p>
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-slate-800 tracking-tight">SecureChat</h1>
                  <p className="text-xs text-indigo-600 font-medium">{user?.email}</p>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-1">
             {isSelectionMode ? (
               <Button 
                 size="sm" 
                 onClick={handleCreateGroup} 
                 disabled={selectedContacts.length === 0}
                 className="bg-indigo-600 text-white hover:bg-indigo-700"
               >
                 Create
               </Button>
             ) : (
               <>
                 <button onClick={() => setShowSearch(!showSearch)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                   <Search className="w-5 h-5" />
                 </button>
                 <button onClick={() => setShowProfileSettings(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-full">
                   <Avatar className="w-8 h-8">
                     <AvatarImage src={userProfile?.avatar} />
                     <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                       {userProfile?.username?.charAt(0) || user?.email?.charAt(0)}
                     </AvatarFallback>
                   </Avatar>
                 </button>
               </>
             )}
          </div>
        </div>

        {/* Collapsible Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pb-2"
            >
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-100 border-none focus:ring-2 focus:ring-indigo-500/50"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Bar */}
        <div className="flex px-2 border-t border-slate-100">
          <TabButton id="contacts" label="Chats" icon={Users} count={0} />
          <TabButton id="groups" label="Groups" icon={MessageCircle} count={groups.length} />
          <TabButton id="requests" label="Requests" icon={UserPlus} count={pendingRequests.length} />
          <TabButton id="invites" label="Invite" icon={QrCode} count={0} />
        </div>
      </header>

      {/* --- ADD FRIEND OVERLAY --- */}
      <AnimatePresence>
        {showAddFriend && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-indigo-50 border-b border-indigo-100 overflow-hidden"
          >
            <div className="p-4 space-y-3">
               <div className="flex justify-between items-center">
                 <h3 className="font-semibold text-indigo-900">Add New Contact</h3>
                 <button onClick={() => setShowAddFriend(false)}><X className="w-4 h-4 text-indigo-400" /></button>
               </div>
               
               <div className="flex space-x-2">
                 <Input
                   placeholder="Friend's Email"
                   value={newFriendEmail}
                   onChange={(e) => setNewFriendEmail(e.target.value)}
                   className="bg-white"
                 />
                 <Button onClick={handleSendFriendRequest} className="bg-indigo-600 hover:bg-indigo-700">
                   <Send className="w-4 h-4" />
                 </Button>
               </div>
               
               <div className="relative py-2">
                 <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-indigo-200"></span></div>
                 <div className="relative flex justify-center text-xs uppercase"><span className="bg-indigo-50 px-2 text-indigo-400">Or via code</span></div>
               </div>

               <div className="flex space-x-2">
                 <Input
                   placeholder="8-Digit Code"
                   value={addFriendCode}
                   onChange={(e) => setAddFriendCode(e.target.value.toUpperCase())}
                   className="bg-white text-center tracking-widest uppercase font-mono"
                   maxLength={8}
                 />
                 <Button onClick={handleAddFriendByCode} className="bg-green-600 hover:bg-green-700">
                   <UserPlus className="w-4 h-4" />
                 </Button>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- NOTIFICATIONS --- */}
      <AnimatePresence>
        {(successMessage || error) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-4 right-4 z-40"
          >
            <Alert className={`shadow-lg border-l-4 ${successMessage ? 'border-l-green-500 bg-white' : 'border-l-red-500 bg-white'}`}>
              <div className="flex items-center">
                {successMessage ? <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> : <AlertCircle className="w-4 h-4 text-red-500 mr-2" />}
                <AlertDescription className="text-slate-700 font-medium">
                  {successMessage || error}
                </AlertDescription>
              </div>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        
        {/* Filters (Chips) */}
        {activeTab === 'contacts' && (
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'all', label: 'All', icon: Users },
              { id: 'online', label: 'Online', icon: Wifi },
              { id: 'favorites', label: 'Favorites', icon: Star },
              { id: 'recent', label: 'Recent', icon: Clock }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setFilterBy(f.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all whitespace-nowrap ${
                  filterBy === f.id 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <f.icon className="w-3 h-3" />
                <span>{f.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tab Content */}
        <div className="space-y-2 pb-20"> {/* pb-20 for FAB space */}
          
          {/* CONTACTS LIST */}
          {activeTab === 'contacts' && (
            <>
              {filteredContacts.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <Users className="w-8 h-8" />
                  </div>
                  <h3 className="text-slate-900 font-medium">No contacts found</h3>
                  <p className="text-slate-500 text-sm mt-1">Try adding a new friend to start chatting.</p>
                </div>
              ) : (
                filteredContacts.map((contact) => (
                  <motion.div
                    key={contact.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleSelectContact(contact)}
                    className={`
                      relative bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3 cursor-pointer transition-all hover:shadow-md
                      ${selectedContacts.includes(contact.id) ? 'ring-2 ring-indigo-500 bg-indigo-50/50' : ''}
                    `}
                  >
                    <div className="relative">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={contact.avatar} />
                        <AvatarFallback className={`text-white font-bold ${contact.isOnline ? 'bg-indigo-500' : 'bg-slate-400'}`}>
                          {contact.username?.[0] || contact.email[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {contact.isOnline && (
                        <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                         <h3 className="font-semibold text-slate-900 truncate">{contact.displayName || contact.username || contact.email}</h3>
                         <span className="text-[10px] text-slate-400">12:30 PM</span>
                      </div>
                      <p className="text-sm text-slate-500 truncate flex items-center">
                        {contact.isFavorite && <Heart className="w-3 h-3 text-red-500 mr-1 fill-current" />}
                        {contact.lastMessage?.content || "Tap to start chatting"}
                      </p>
                    </div>

                    {!isSelectionMode && (
                      <button 
                         onClick={(e) => { e.stopPropagation(); setRenamingContact(contact); }}
                         className="p-2 text-slate-300 hover:text-indigo-600 transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </motion.div>
                ))
              )}
            </>
          )}

          {/* GROUPS LIST */}
          {activeTab === 'groups' && (
            groups.map((group) => (
              <motion.div
                key={group.id}
                layout
                className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex items-center space-x-3 cursor-pointer hover:shadow-md"
              >
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{group.name}</h3>
                  <p className="text-sm text-slate-500">{group.members.length} members</p>
                </div>
              </motion.div>
            ))
          )}
          
          {/* INVITE TAB */}
          {activeTab === 'invites' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 text-center space-y-6">
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto text-indigo-600">
                <QrCode className="w-10 h-10" />
              </div>
              
              <div>
                <h3 className="text-lg font-bold text-slate-900">Your Invite Code</h3>
                <p className="text-slate-500 text-sm">Share this code with friends to connect instantly.</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <p className="text-3xl font-mono font-bold tracking-widest text-slate-800">
                  {currentInviteCode?.code || '...'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <Button onClick={copyInviteCode} variant="outline" className="border-slate-200 hover:bg-slate-50">
                    {copiedCode ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    {copiedCode ? "Copied" : "Copy"}
                 </Button>
                 <Button onClick={generateNewInviteCode} className="bg-indigo-600 hover:bg-indigo-700">
                    <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                 </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- FLOATING ACTION BUTTON (FAB) --- */}
      <div className="absolute bottom-6 right-6 z-40 flex flex-col space-y-3 items-end">
        {/* Expandable options could go here */}
        
        <motion.button
          onClick={() => {
            if (activeTab === 'contacts') setShowAddFriend(!showAddFriend);
            else if (activeTab === 'groups') setIsSelectionMode(!isSelectionMode);
          }}
          className="w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center hover:bg-indigo-700 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {activeTab === 'groups' ? <Users className="w-6 h-6" /> : <UserPlus className="w-6 h-6" />}
        </motion.button>
      </div>

      {/* --- MODALS --- */}
      <AnimatePresence>
        {showProfileSettings && <ProfileSettings onClose={() => setShowProfileSettings(false)} />}
        {renamingContact && (
          <ContactRename
            contact={renamingContact}
            onRename={renameContact}
            onClose={() => setRenamingContact(null)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
