import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useTranslation } from '../contexts/TranslationContext';
import { Input } from '@/components/ui/input';
import {
  Send,
  LogOut,
  WifiOff,
  User,
  ShieldCheck,
  Paperclip,
  Smile,
  Settings,
  Search,
  Phone,
  Video,
  MoreVertical,
  ArrowLeft,
  Image as ImageIcon,
  Check,
  CheckCheck
} from 'lucide-react';
import MessageBubble from '../components/MessageBubble';
import MediaUpload from '../components/MediaUpload';
import EmojiPicker from '../components/EmojiPicker';
import TranslationSettings from '../components/TranslationSettings';
import DebugPanel from '../components/DebugPanel';

interface ChatProps {
  partner: { id: string; email: string };
  onDisconnect: () => void;
  onBack?: () => void;
}

export default function Chat({ partner, onDisconnect, onBack }: ChatProps) {
  const { user } = useAuth();
  const { 
    messages, 
    sendMessage, 
    sendTyping, 
    partnerTyping, 
    partnerOnline, 
    isConnected,
    sendFile 
  } = useSocket();
  
  const { 
    isTranslationEnabled, 
    targetLanguage 
  } = useTranslation();

  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [messageReactions, setMessageReactions] = useState<{[key: string]: string[]}>({});
  const [showDebugPanel, setShowDebugPanel] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Filter messages based on search
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(msg => 
      msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.senderEmail.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;
    try {
      sendMessage(newMessage, 'text');
      setNewMessage('');
      setIsTyping(false);
      sendTyping(false);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }, [newMessage, sendMessage, sendTyping]);

  const handleTyping = useCallback((value: string) => {
    setNewMessage(value);
    
    if (!isTyping) {
      setIsTyping(true);
      sendTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      sendTyping(false);
    }, 1000);
  }, [isTyping, sendTyping]);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      await sendFile(file);
      setShowMediaUpload(false);
    } catch (error) {
      console.error('Failed to send file:', error);
    }
  }, [sendFile]);

  const addReaction = useCallback((messageId: string, emoji: string) => {
    setMessageReactions(prev => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), emoji]
    }));
  }, []);

  return (
    <div className="flex flex-col h-screen bg-[#F0F2F5] font-sans text-slate-900 relative">
      
      {/* --- APP BAR (Material Style) --- */}
      <motion.header 
        className="bg-white px-4 py-3 shadow-sm z-20 flex items-center justify-between sticky top-0"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="flex items-center space-x-3">
          {onBack && (
            <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center border border-indigo-50">
              <User className="w-6 h-6 text-indigo-600" />
            </div>
            {partnerOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
            )}
          </div>

          <div className="flex flex-col">
            <h2 className="font-semibold text-slate-800 text-sm leading-tight">{partner.email}</h2>
            <div className="flex items-center text-xs text-slate-500">
               {partnerTyping ? (
                 <span className="text-indigo-600 font-medium animate-pulse">typing...</span>
               ) : partnerOnline ? (
                 <span>Online</span>
               ) : (
                 <span>Last seen recently</span>
               )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Quick Actions Toolbar */}
          <div className="hidden md:flex items-center space-x-1 mr-2">
             <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors" title="Voice Call">
               <Phone className="w-5 h-5" />
             </button>
             <button className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors" title="Video Call">
               <Video className="w-5 h-5" />
             </button>
             <button 
               onClick={() => setShowSearch(!showSearch)}
               className={`p-2 rounded-full transition-colors ${showSearch ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-100'}`} 
             >
               <Search className="w-5 h-5" />
             </button>
          </div>

          <button 
            onClick={() => setShowTranslationSettings(true)}
            className={`p-2 rounded-full transition-colors ${isTranslationEnabled ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600 hover:bg-slate-100'}`}
            title="Translation Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          
          <div className="relative">
             <button 
               onClick={() => setShowMenu(!showMenu)}
               className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
             >
               <MoreVertical className="w-5 h-5" />
             </button>
             
             <AnimatePresence>
               {showMenu && (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 0.95 }}
                   className="absolute right-0 top-12 w-48 bg-white rounded-lg shadow-xl border border-slate-100 py-1 z-50 origin-top-right"
                 >
                    <button onClick={() => setShowDebugPanel(true)} className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">Debug Console</button>
                    <button onClick={onDisconnect} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center">
                      <LogOut className="w-4 h-4 mr-2" /> End Session
                    </button>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>
      </motion.header>

      {/* --- SEARCH BAR (Collapsible) --- */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-white border-b border-slate-200 overflow-hidden"
          >
            <div className="p-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search in conversation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100 text-slate-800 text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  autoFocus
                />
                <button onClick={() => {setSearchQuery(''); setShowSearch(false)}} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">
                  <span className="text-xs font-bold">✕</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- CHAT AREA --- */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2 relative"
        style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }}
      >
        {/* Encryption Banner */}
        <div className="flex justify-center mb-6">
          <div className="bg-[#FFF8C5] text-[#7A6000] text-xs px-3 py-1.5 rounded-lg shadow-sm border border-[#FFEBA3] flex items-center">
            <ShieldCheck className="w-3 h-3 mr-1.5" />
            Messages are end-to-end encrypted. No one outside of this chat, not even SecureChat, can read them.
          </div>
        </div>

        <AnimatePresence initial={false}>
          {filteredMessages.map((message, index) => {
            const isOwn = message.senderEmail === user?.email;
            
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                layout
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'} group mb-1`}
              >
                <div className={`max-w-[85%] md:max-w-[70%] relative`}>
                  
                  {/* Message Bubble */}
                  <div className={`
                    relative px-4 py-2 shadow-sm text-[15px] leading-relaxed break-words
                    ${isOwn 
                      ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
                      : 'bg-white text-slate-800 rounded-2xl rounded-tl-sm border border-slate-100'
                    }
                  `}>
                    <MessageBubble 
                      message={message} 
                      isOwn={isOwn}
                      onReact={(emoji) => addReaction(message.id, emoji)}
                    />
                    
                    {/* Time & Status */}
                    <div className={`text-[10px] flex justify-end items-center gap-1 mt-1 ${isOwn ? 'text-indigo-200' : 'text-slate-400'}`}>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {isOwn && <CheckCheck className="w-3 h-3" />}
                    </div>
                  </div>

                  {/* Reactions Display */}
                  {messageReactions[message.id] && (
                    <div className={`absolute -bottom-2 ${isOwn ? 'left-0' : 'right-0'} flex gap-0.5`}>
                      {messageReactions[message.id].map((emoji, i) => (
                        <motion.div 
                          key={i} 
                          initial={{ scale: 0 }} 
                          animate={{ scale: 1 }}
                          className="bg-white border border-slate-200 rounded-full px-1.5 py-0.5 text-xs shadow-sm"
                        >
                          {emoji}
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {/* Hover Actions */}
                  <div className={`
                    absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity
                    ${isOwn ? '-left-12' : '-right-12'}
                  `}>
                    <button 
                      onClick={() => addReaction(message.id, '👍')}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-600"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing Indicator */}
        {partnerTyping && (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex justify-start">
             <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-sm py-3 px-4 shadow-sm flex space-x-1 items-center">
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
               <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
             </div>
           </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* --- INPUT AREA --- */}
      <div className="bg-white px-4 py-3 border-t border-slate-200 z-20">
        <div className="max-w-4xl mx-auto flex items-end space-x-2">
          
          {/* Attachments */}
          <div className="flex pb-2">
            <button 
              onClick={() => setShowMediaUpload(true)}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <Paperclip className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowMediaUpload(true)}
              className="hidden sm:block p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Text Input */}
          <div className="flex-1 relative bg-slate-100 rounded-2xl border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all">
             <textarea
               ref={inputRef as any}
               value={newMessage}
               onChange={(e) => setNewMessage(e.target.value)}
               onKeyDown={(e) => {
                 if (e.key === 'Enter' && !e.shiftKey) {
                   e.preventDefault();
                   handleSendMessage();
                 } else {
                   handleTyping(e.currentTarget.value);
                 }
               }}
               placeholder="Type a message..."
               className="w-full bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 resize-none py-3 pl-4 pr-10 max-h-32 min-h-[44px]"
               rows={1}
               disabled={!isConnected}
             />
             
             {/* Emoji Button inside Input */}
             <button 
               onClick={() => setShowEmojiPicker(!showEmojiPicker)}
               className="absolute right-2 bottom-2 p-1.5 text-slate-400 hover:text-indigo-600 transition-colors"
             >
               <Smile className="w-5 h-5" />
             </button>
          </div>

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className={`
              p-3 rounded-full shadow-sm transition-all flex items-center justify-center mb-1
              ${newMessage.trim() && isConnected 
                ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'}
            `}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>

        {/* Connection Warning */}
        {!isConnected && (
           <div className="text-center mt-2 flex items-center justify-center text-xs text-red-500 font-medium">
             <WifiOff className="w-3 h-3 mr-1" /> Reconnecting...
           </div>
        )}
      </div>

      {/* --- MODALS & OVERLAYS --- */}
      
      {/* Emoji Picker Popover */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="absolute bottom-20 right-4 md:right-auto md:left-20 z-50 shadow-2xl rounded-xl"
          >
            <div className="bg-white rounded-xl overflow-hidden border border-slate-200">
               <EmojiPicker
                 onEmojiSelect={(emoji) => {
                   setNewMessage(prev => prev + emoji);
                 }}
                 onClose={() => setShowEmojiPicker(false)}
               />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translation Settings Modal */}
      <AnimatePresence>
        {showTranslationSettings && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
             <motion.div 
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.9 }}
               className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
             >
               <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                 <h3 className="font-semibold text-slate-800 flex items-center">
                   <Settings className="w-4 h-4 mr-2 text-indigo-600" /> Translation Settings
                 </h3>
                 <button onClick={() => setShowTranslationSettings(false)} className="text-slate-500 hover:text-slate-800">✕</button>
               </div>
               <div className="p-4">
                 <TranslationSettings onClose={() => setShowTranslationSettings(false)} />
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Media Upload Modal */}
      <AnimatePresence>
        {showMediaUpload && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg"
            >
              <MediaUpload
                onFileSelect={handleFileUpload}
                onClose={() => setShowMediaUpload(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebugPanel && (
          <DebugPanel onClose={() => setShowDebugPanel(false)} />
        )}
      </AnimatePresence>

    </div>
  );
}
