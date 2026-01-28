import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useEncryption } from '../contexts/EncryptionContext';
import { useTranslation } from '../contexts/TranslationContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Send, 
  Users, 
  ArrowLeft, 
  MessageCircle,
  ShieldCheck,
  Paperclip,
  Smile,
  Settings,
  Search,
  Phone,
  Video,
  MoreVertical,
  UserPlus,
  Volume2,
  VolumeX,
  Pin,
  Crown,
  Reply,
  X,
  Image as ImageIcon,
  CheckCheck,
  LogOut,
  Bell,
  BellOff
} from 'lucide-react';
import { ChatMessage } from '@shared/api';
import MessageBubble from '../components/MessageBubble';
import MediaUpload from '../components/MediaUpload';
import EmojiPicker from '../components/EmojiPicker';
import TranslationSettings from '../components/TranslationSettings';

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
  members: GroupMember[];
  settings: {
    encryptionLevel: 'standard' | 'enhanced';
  };
}

interface GroupChatProps {
  group: GroupInfo;
  onBack: () => void;
  onUpdateGroup: (group: GroupInfo) => void;
}

export default function GroupChat({ group, onBack, onUpdateGroup }: GroupChatProps) {
  const { user } = useAuth();
  const { 
    messages, 
    sendMessage, 
    sendTyping, 
    isConnected,
    sendFile 
  } = useSocket();
  const { encryptMessage } = useEncryption();
  const { isTranslationEnabled } = useTranslation();

  // State
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<string[]>([]);
  
  // Sidebar State
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 1024);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Responsive Logic
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (mobile) setShowSidebar(false);
      else setShowSidebar(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter Messages
  const filteredMessages = useMemo(() => {
    let msgs = messages;
    if (searchQuery) {
      msgs = msgs.filter(msg => 
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.senderEmail?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    return msgs;
  }, [messages, searchQuery]);

  const onlineMembers = group.members.filter(member => member.isOnline);
  const typingMembers = group.members.filter(member => member.isTyping);
  const currentUserRole = group.members.find(m => m.id === user?.id)?.role || 'member';

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMembers.length]);

  // Handlers
  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    try {
      let messageToSend = newMessage;
      if (replyingTo) {
        // In a real app, you'd attach the reply ID metadata
        messageToSend = `Replying to ${replyingTo.senderEmail}: ${newMessage}`;
        setReplyingTo(null);
      }
      
      const encrypted = await encryptMessage(messageToSend);
      await sendMessage(encrypted, 'text'); // Assuming sendMessage handles string/object appropriately
      setNewMessage('');
      setIsTyping(false);
      sendTyping(false);
    } catch (error) { console.error('Send failed', error); }
  }, [newMessage, encryptMessage, sendMessage, replyingTo, sendTyping]);

  const handleTyping = (val: string) => {
    setNewMessage(val);
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 1000);
  };

  const handleFileUpload = async (file: File) => {
    try {
      await sendFile(file);
      setShowMediaUpload(false);
    } catch (e) { console.error(e); }
  };

  const handlePinMessage = (msgId: string) => {
    setPinnedMessages(prev => prev.includes(msgId) ? prev.filter(id => id !== msgId) : [...prev, msgId]);
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5] font-sans text-slate-900 overflow-hidden relative">
      
      {/* --- MAIN CHAT COLUMN --- */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        
        {/* Header */}
        <header className="bg-white shadow-sm px-4 py-3 z-20 flex justify-between items-center relative">
          <div className="flex items-center space-x-3 overflow-hidden">
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full text-slate-600 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            
            <div className="relative flex-shrink-0">
              <Avatar className="w-10 h-10 border border-slate-100">
                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                  {group.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {onlineMembers.length > 0 && (
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
              )}
            </div>

            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => isMobile && setShowSidebar(!showSidebar)}>
              <h2 className="font-bold text-slate-800 truncate leading-tight flex items-center">
                {group.name}
                {isMuted && <VolumeX className="w-3 h-3 text-slate-400 ml-2" />}
              </h2>
              <p className="text-xs text-slate-500 truncate">
                {typingMembers.length > 0 ? (
                  <span className="text-indigo-600 font-medium animate-pulse">
                    {typingMembers.map(m => m.username || m.email.split('@')[0]).join(', ')} typing...
                  </span>
                ) : (
                  `${group.members.length} members, ${onlineMembers.length} online`
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 flex-shrink-0">
            <button onClick={() => setShowSearch(!showSearch)} className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
              <Search className="w-5 h-5" />
            </button>
            <button onClick={() => setShowSidebar(!showSidebar)} className={`p-2 rounded-full transition-colors ${showSidebar ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`}>
              <MoreVertical className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Pinned Messages Bar */}
        <AnimatePresence>
          {pinnedMessages.length > 0 && (
             <motion.div 
               initial={{ height: 0, opacity: 0 }}
               animate={{ height: 'auto', opacity: 1 }}
               exit={{ height: 0, opacity: 0 }}
               className="bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between z-10"
             >
               <div className="flex items-center text-xs text-slate-600">
                 <Pin className="w-3 h-3 mr-2 text-indigo-500 fill-current" />
                 <span className="font-medium">{pinnedMessages.length} Pinned Messages</span>
               </div>
               <button className="text-indigo-600 text-xs font-medium hover:underline">View All</button>
             </motion.div>
          )}
        </AnimatePresence>

        {/* Search Bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div 
              initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
              className="bg-white border-b border-slate-200 overflow-hidden"
            >
              <div className="p-2">
                <Input 
                  placeholder="Search in conversation..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-slate-100 border-none h-9 text-sm"
                  autoFocus
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Message List */}
        <div 
          className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar relative"
          style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
        >
          {/* Encryption Notice */}
          <div className="flex justify-center my-4">
             <div className="bg-[#FFF8C5] text-[#7A6000] text-[11px] font-medium px-3 py-1 rounded-lg shadow-sm border border-[#FFEBA3] flex items-center">
               <ShieldCheck className="w-3 h-3 mr-1.5" />
               Group is end-to-end encrypted.
             </div>
          </div>

          <AnimatePresence initial={false} mode="popLayout">
            {filteredMessages.map((message, index) => {
              const isOwn = message.senderId === user?.id;
              const sender = group.members.find(m => m.id === message.senderId);
              
              // Generate a consistent color index for the sender based on their ID length
              const colorIndex = (message.senderId?.length || 0) % 6;
              const senderColors = [
                'text-red-600', 'text-orange-600', 'text-amber-600', 
                'text-green-600', 'text-blue-600', 'text-purple-600'
              ];

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  layout
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group`}
                >
                  <div className={`max-w-[85%] md:max-w-[70%]`}>
                    
                    {/* Message Bubble */}
                    <div className={`
                      relative px-3 py-2 shadow-sm text-[15px] leading-relaxed break-words
                      ${isOwn 
                        ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                        : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'
                      }
                      ${pinnedMessages.includes(message.id) ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
                    `}>
                      {/* Sender Name (Only for received messages) */}
                      {!isOwn && (
                        <div className={`text-xs font-bold mb-1 ${senderColors[colorIndex]}`}>
                          {sender?.username || message.senderEmail?.split('@')[0]}
                          {sender?.role === 'admin' && <span className="ml-1 text-[10px] bg-slate-100 px-1 rounded text-slate-500 font-normal">admin</span>}
                        </div>
                      )}

                      {/* Replying Context Inside Bubble */}
                      {/* Note: Ideally 'message' object should have 'replyTo' field. Assuming simplified here. */}
                      
                      <MessageBubble 
                        message={message} 
                        isOwn={isOwn}
                        onReact={() => {}}
                      />
                      
                      <div className={`text-[10px] flex justify-end items-center gap-1 mt-1 ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {isOwn && <CheckCheck className="w-3 h-3" />}
                        {pinnedMessages.includes(message.id) && <Pin className="w-3 h-3 ml-1 fill-current" />}
                      </div>
                    </div>

                    {/* Actions Menu (Hover) */}
                    <div className={`
                      absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white rounded-full shadow-md border border-slate-100 z-10
                      ${isOwn ? '-left-14' : '-right-14'}
                    `}>
                      <button onClick={() => setReplyingTo(message)} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600"><Reply className="w-4 h-4"/></button>
                      <button onClick={() => handlePinMessage(message.id)} className="p-1.5 hover:bg-slate-50 rounded-full text-slate-600"><Pin className="w-4 h-4"/></button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Preview Panel */}
        <AnimatePresence>
          {replyingTo && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }} 
              exit={{ height: 0, opacity: 0 }}
              className="px-4 pt-2 bg-slate-50 border-t border-slate-200"
            >
              <div className="flex justify-between items-center bg-white border-l-4 border-indigo-500 rounded-r-lg p-2 shadow-sm">
                <div className="text-sm overflow-hidden">
                  <span className="font-bold text-indigo-600 text-xs block mb-0.5">Replying to {replyingTo.senderEmail}</span>
                  <span className="text-slate-600 truncate block">{replyingTo.content}</span>
                </div>
                <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4 text-slate-400"/></button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <div className="p-3 bg-white border-t border-slate-200">
           <div className="flex items-end space-x-2 max-w-5xl mx-auto">
             <div className="flex pb-2 space-x-1">
               <button onClick={() => setShowMediaUpload(true)} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><Paperclip className="w-5 h-5" /></button>
               <button onClick={() => setShowMediaUpload(true)} className="hidden sm:block p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"><ImageIcon className="w-5 h-5" /></button>
             </div>
             
             <div className="flex-1 relative bg-slate-100 rounded-2xl border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
               <textarea
                 ref={inputRef}
                 value={newMessage}
                 onChange={(e) => handleTyping(e.target.value)}
                 onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                 }}
                 placeholder={`Message ${group.name}...`}
                 className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 resize-none py-3 pl-4 pr-10 max-h-32 min-h-[44px] text-sm"
                 rows={1}
                 disabled={!isConnected}
               />
               <button 
                 onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                 className="absolute right-2 bottom-2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
               >
                 <Smile className="w-5 h-5" />
               </button>
             </div>

             <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim()}
                className={`p-3 rounded-full shadow-sm transition-all mb-1 ${newMessage.trim() ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-slate-200 text-slate-400'}`}
             >
               <Send className="w-5 h-5 ml-0.5" />
             </button>
           </div>
        </div>
      </div>

      {/* --- RIGHT SIDEBAR (DRAWER) --- */}
      <AnimatePresence>
        {showSidebar && (
          <>
            {/* Backdrop for mobile */}
            {isMobile && (
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={() => setShowSidebar(false)}
                className="fixed inset-0 bg-black/50 z-30 lg:hidden"
              />
            )}
            
            <motion.div 
              className={`
                bg-white border-l border-slate-200 z-40 overflow-y-auto flex flex-col
                ${isMobile ? 'fixed inset-y-0 right-0 w-80 shadow-2xl' : 'w-80'}
              `}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Sidebar Header */}
              <div className="p-6 text-center border-b border-slate-100 relative">
                <button onClick={() => setShowSidebar(false)} className="absolute top-4 right-4 p-2 hover:bg-slate-50 rounded-full lg:hidden">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
                <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-slate-50">
                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-3xl font-bold">
                    {group.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-slate-900">{group.name}</h2>
                <p className="text-slate-500 text-sm mt-1">Group • {group.members.length} members</p>
              </div>

              {/* Quick Actions */}
              <div className="p-4 border-b border-slate-100 flex justify-around">
                <div className="flex flex-col items-center cursor-pointer group" onClick={() => setIsMuted(!isMuted)}>
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
                    {isMuted ? <BellOff className="w-5 h-5" /> : <Bell className="w-5 h-5" />}
                  </div>
                  <span className="text-xs text-slate-600 mt-1 font-medium">{isMuted ? 'Unmute' : 'Mute'}</span>
                </div>
                <div className="flex flex-col items-center cursor-pointer group">
                   <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-slate-200 transition-colors">
                     <Search className="w-5 h-5" />
                   </div>
                   <span className="text-xs text-slate-600 mt-1 font-medium">Search</span>
                </div>
              </div>

              {/* Members List */}
              <div className="flex-1 p-4">
                <div className="flex items-center justify-between mb-3">
                   <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Members</h3>
                   {currentUserRole === 'admin' && (
                     <button className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-full transition-colors"><UserPlus className="w-4 h-4" /></button>
                   )}
                </div>
                
                <div className="space-y-3">
                  {group.members.map(member => (
                    <div key={member.id} className="flex items-center space-x-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors">
                      <div className="relative">
                        <Avatar className="w-9 h-9">
                           <AvatarFallback className="bg-slate-200 text-slate-600 text-xs font-bold">
                             {member.email.charAt(0).toUpperCase()}
                           </AvatarFallback>
                        </Avatar>
                        {member.isOnline && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full"></span>}
                      </div>
                      <div className="flex-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-900 truncate">
                              {member.username || member.email.split('@')[0]}
                              {member.id === user?.id && <span className="ml-1 text-slate-400 font-normal">(You)</span>}
                            </span>
                            {member.role === 'admin' && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 rounded border border-indigo-200">Admin</span>}
                         </div>
                         <p className="text-xs text-slate-500 truncate">{member.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div className="p-4 border-t border-slate-100 mt-auto">
                <button className="w-full flex items-center justify-center space-x-2 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium">
                  <LogOut className="w-4 h-4" />
                  <span>Exit Group</span>
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {showEmojiPicker && (
          <div className="absolute bottom-16 right-4 z-50">
             <EmojiPicker onEmojiSelect={(e) => setNewMessage(p => p + e)} onClose={() => setShowEmojiPicker(false)} />
          </div>
        )}
        {showMediaUpload && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <MediaUpload onFileSelect={handleFileUpload} onClose={() => setShowMediaUpload(false)} />
          </div>
        )}
        {showTranslationSettings && (
           <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
             <TranslationSettings onClose={() => setShowTranslationSettings(false)} />
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}
