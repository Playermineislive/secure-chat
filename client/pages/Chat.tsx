import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import { useEncryption } from "../contexts/EncryptionContext";
import { useTranslation } from "../contexts/TranslationContext";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Shield,
  Users,
  LogOut,
  Wifi,
  WifiOff,
  MessageCircle,
  User,
  ShieldCheck,
  AlertTriangle,
  Paperclip,
  Smile,
  X,
  Languages,
  Settings,
  Globe,
  Sparkles,
  Zap,
  Phone,
  Video,
  MoreVertical,
  Search,
  Star,
  Heart,
  Coffee,
  Music,
  ArrowLeft,
  Palette,
} from "lucide-react";
import { ChatMessage, FileUpload, MediaContent } from "@shared/api";
import MessageBubble from "../components/MessageBubble";
import MediaUpload from "../components/MediaUpload";
import EmojiPicker from "../components/EmojiPicker";
import TranslationSettings from "../components/TranslationSettings";
import DebugPanel from "../components/DebugPanel";
import ThemeSelector from "../components/ThemeSelector";

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
    sendFile,
  } = useSocket();
  // Encryption is handled in SocketContext
  const {
    isTranslationEnabled,
    targetLanguage,
    translateMessage,
    supportedLanguages,
  } = useTranslation();
  const { currentTheme, isWeatherEnabled, currentWeather } = useTheme();

  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [messageReactions, setMessageReactions] = useState<{
    [key: string]: string[];
  }>({});
  const [showDebugPanel, setShowDebugPanel] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Optimized message filtering
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(
      (msg) =>
        msg.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        msg.senderEmail.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [messages, searchQuery]);

  // Chat themes for unique design
  const chatThemes = [
    {
      name: "Ocean Breeze",
      bg: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      messageUser: "from-blue-500 to-purple-600",
      messagePartner: "from-gray-600 to-gray-700",
    },
    {
      name: "Sunset Glow",
      bg: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
      messageUser: "from-pink-500 to-rose-600",
      messagePartner: "from-gray-600 to-gray-700",
    },
    {
      name: "Forest Night",
      bg: "linear-gradient(135deg, #134e5e 0%, #71b280 100%)",
      messageUser: "from-green-500 to-emerald-600",
      messagePartner: "from-gray-600 to-gray-700",
    },
  ];

  const localChatTheme = chatThemes[chatTheme];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    // Auto-cycle chat themes
    const themeInterval = setInterval(() => {
      setChatTheme((prev) => (prev + 1) % chatThemes.length);
    }, 30000);

    return () => clearInterval(themeInterval);
  }, [chatThemes.length]);

  const handleSendMessage = useCallback(async () => {
    if (!newMessage.trim()) return;

    try {
      // For now, send messages as plain text since encryption is handled in SocketContext
      // The SocketContext will handle encryption with available keys
      sendMessage(newMessage, "text");
      setNewMessage("");
      setIsTyping(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  }, [newMessage, sendMessage]);

  const handleTyping = useCallback(
    (value: string) => {
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
    },
    [isTyping, sendTyping],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        await sendFile(file);
        setShowMediaUpload(false);
      } catch (error) {
        console.error("Failed to send file:", error);
      }
    },
    [sendFile],
  );

  const addReaction = useCallback((messageId: string, emoji: string) => {
    setMessageReactions((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] || []), emoji],
    }));
  }, []);

  const quickActions = [
    {
      icon: Phone,
      label: "Voice Call",
      action: () => console.log("Voice call"),
    },
    {
      icon: Video,
      label: "Video Call",
      action: () => console.log("Video call"),
    },
    { icon: Search, label: "Search", action: () => setShowSearch(!showSearch) },
    {
      icon: Palette,
      label: "Themes",
      action: () => setShowThemeSelector(true),
    },
    {
      icon: Settings,
      label: "Settings",
      action: () => setShowTranslationSettings(true),
    },
    {
      icon: AlertTriangle,
      label: "Debug",
      action: () => setShowDebugPanel(true),
    },
  ];

  const quickReactions = ["❤️", "😊", "👍", "😂", "😮", "😢"];

  return (
    <div className="h-screen flex flex-col relative overflow-hidden">
      {/* Animated background with theme */}
      <motion.div
        className="absolute inset-0"
        style={{ background: localChatTheme.background }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Theme pattern overlay */}
      {localChatTheme.pattern && (
        <motion.div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: localChatTheme.pattern }}
          animate={{ opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Floating elements for ambiance */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(4)].map((_, i) => (
          <motion.div
            key={i}
            className={`absolute w-4 h-4 rounded-full bg-white/10 backdrop-blur-sm`}
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -20, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Header */}
      <motion.header
        className={`relative z-10 ${localChatTheme.headerStyle.background} backdrop-blur-xl border-b border-white/20`}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center space-x-4">
            {onBack && (
              <motion.button
                onClick={onBack}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-[1rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
                whileHover={{ scale: 1.1, x: -2 }}
                whileTap={{ scale: 0.9 }}
                title="Back to Contacts"
              >
                <ArrowLeft className="w-5 h-5" />
              </motion.button>
            )}
            <motion.div
              className="relative"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/10 rounded-[1.5rem] flex items-center justify-center border border-white/20">
                <User className="w-6 h-6 text-white" />
              </div>
              {partnerOnline && (
                <motion.div
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.div>

            <div>
              <h2 className="text-white font-semibold text-lg">
                {partner.email}
              </h2>
              <div className="flex items-center space-x-2">
                <motion.div
                  className={`w-2 h-2 rounded-full ${partnerOnline ? "bg-green-400" : "bg-gray-400"}`}
                  animate={partnerOnline ? { opacity: [0.5, 1, 0.5] } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                />
                <span className="text-white/70 text-sm">
                  {partnerOnline ? "Online" : "Offline"}
                  {partnerTyping && " • typing..."}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {quickActions.map((action, index) => (
              <motion.button
                key={index}
                onClick={action.action}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-[1rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
                whileHover={{ scale: 1.1, y: -2 }}
                whileTap={{ scale: 0.9 }}
                title={action.label}
              >
                <action.icon className="w-5 h-5" />
              </motion.button>
            ))}

            <motion.button
              onClick={onDisconnect}
              className="w-10 h-10 bg-red-500/20 hover:bg-red-500/30 rounded-[1rem] flex items-center justify-center text-red-300 hover:text-red-200 transition-all duration-200 backdrop-blur-sm"
              whileHover={{ scale: 1.1, y: -2 }}
              whileTap={{ scale: 0.9 }}
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
          </div>
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              className="px-4 pb-4"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Input
                placeholder="Search messages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-white/10 border-white/20 text-white placeholder:text-white/60 rounded-[1.5rem] backdrop-blur-sm"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Theme indicator */}
        <motion.div
          className="absolute top-4 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-white/10 rounded-[1rem] backdrop-blur-sm"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          <span className="text-white/80 text-xs font-medium">
            {localChatTheme.name}
          </span>
        </motion.div>
      </motion.header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 relative z-10 scrollbar-hide">
        <AnimatePresence mode="popLayout">
          {filteredMessages.map((message, index) => (
            <motion.div
              key={`${message.id}-${index}`}
              className={`flex ${message.senderEmail === user?.email ? "justify-end" : "justify-start"}`}
              initial={{ opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              transition={{
                duration: 0.3,
                delay: index * 0.05,
                type: "spring",
                bounce: 0.3,
              }}
              layout
            >
              <div className="max-w-xs lg:max-w-md relative group">
                <motion.div
                  className={`p-4 rounded-[2rem] backdrop-blur-sm border border-white/20 relative overflow-hidden ${
                    message.senderEmail === user?.email
                      ? `bg-gradient-to-br ${localChatTheme.messageUser} text-white`
                      : `bg-gradient-to-br ${localChatTheme.messagePartner} text-white`
                  }`}
                  whileHover={{ scale: 1.02, y: -2 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Message shimmer effect */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent"
                    animate={{
                      x: [-100, 100],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  <MessageBubble
                    message={message}
                    isOwn={message.senderEmail === user?.email}
                    onReact={(emoji) => addReaction(message.id, emoji)}
                  />

                  {/* Message reactions */}
                  {messageReactions[message.id] && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {messageReactions[message.id].map((reaction, i) => (
                        <motion.span
                          key={i}
                          className="text-sm bg-white/20 rounded-full px-2 py-1"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: i * 0.1 }}
                        >
                          {reaction}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </motion.div>

                {/* Quick reactions on hover */}
                <motion.div
                  className="absolute -top-8 left-1/2 transform -translate-x-1/2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                  initial={{ y: 10 }}
                  whileHover={{ y: 0 }}
                >
                  {quickReactions.map((emoji, i) => (
                    <motion.button
                      key={i}
                      onClick={() => addReaction(message.id, emoji)}
                      className="w-8 h-8 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-white/20 transition-all duration-200"
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <span className="text-sm">{emoji}</span>
                    </motion.button>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing indicator */}
        <AnimatePresence>
          {partnerTyping && (
            <motion.div
              className="flex justify-start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="bg-white/10 backdrop-blur-sm rounded-[2rem] px-4 py-3 border border-white/20">
                <div className="flex space-x-1">
                  {[...Array(3)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="w-2 h-2 bg-white/60 rounded-full"
                      animate={{ y: [0, -4, 0] }}
                      transition={{
                        duration: 0.6,
                        repeat: Infinity,
                        delay: i * 0.2,
                      }}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input section */}
      <motion.div
        className={`relative z-10 p-4 ${localChatTheme.inputStyle.background} backdrop-blur-xl border-t ${localChatTheme.inputStyle.border}`}
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-end space-x-3">
          <div className="flex space-x-2">
            <motion.button
              onClick={() => setShowMediaUpload(true)}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-[1.5rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
              whileHover={{ scale: 1.1, rotate: 5 }}
              whileTap={{ scale: 0.9 }}
            >
              <Paperclip className="w-5 h-5" />
            </motion.button>

            <motion.button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-[1.5rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
              whileHover={{ scale: 1.1, rotate: -5 }}
              whileTap={{ scale: 0.9 }}
            >
              <Smile className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => handleTyping(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder="Type a message..."
              className={`${localChatTheme.inputStyle.background} ${localChatTheme.inputStyle.border} ${localChatTheme.inputStyle.text} ${localChatTheme.inputStyle.placeholder} rounded-[2rem] pr-12 h-12 backdrop-blur-sm focus:ring-2 focus:ring-white/30 transition-all duration-200`}
              disabled={!isConnected}
              style={{ fontSize: "16px" }}
            />

            {isTranslationEnabled && (
              <motion.div
                className="absolute right-12 top-1/2 transform -translate-y-1/2"
                animate={{ rotate: [0, 360] }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              >
                <Languages className="w-4 h-4 text-white/60" />
              </motion.div>
            )}
          </div>

          <motion.button
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !isConnected}
            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-500 disabled:to-gray-600 rounded-[1.5rem] flex items-center justify-center text-white transition-all duration-200 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.9 }}
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </div>

        {/* Connection status */}
        <AnimatePresence>
          {!isConnected && (
            <motion.div
              className="mt-3 flex items-center justify-center space-x-2 text-red-300 text-sm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              <WifiOff className="w-4 h-4" />
              <span>Connection lost. Reconnecting...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Emoji Picker */}
      <AnimatePresence>
        {showEmojiPicker && (
          <motion.div
            className="absolute bottom-20 left-4 z-50"
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3, type: "spring" }}
          >
            <EmojiPicker
              onEmojiSelect={(emoji) => {
                setNewMessage((prev) => prev + emoji);
                setShowEmojiPicker(false);
              }}
              onClose={() => setShowEmojiPicker(false)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Media Upload */}
      <AnimatePresence>
        {showMediaUpload && (
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              <MediaUpload
                onFileSelect={handleFileUpload}
                onClose={() => setShowMediaUpload(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Translation Settings */}
      <AnimatePresence>
        {showTranslationSettings && (
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, type: "spring" }}
            >
              <TranslationSettings
                onClose={() => setShowTranslationSettings(false)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Debug Panel */}
      <AnimatePresence>
        {showDebugPanel && (
          <DebugPanel onClose={() => setShowDebugPanel(false)} />
        )}
      </AnimatePresence>

      {/* Theme Selector */}
      <ThemeSelector
        isOpen={showThemeSelector}
        onClose={() => setShowThemeSelector(false)}
      />

      {/* Security indicator */}
      <motion.div
        className="fixed bottom-4 right-4 bg-green-500/20 backdrop-blur-md border border-green-400/50 text-green-300 px-3 py-2 rounded-[1.5rem] flex items-center space-x-2 z-40"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <ShieldCheck className="w-4 h-4" />
        <span className="text-xs font-medium">End-to-End Encrypted</span>
      </motion.div>
    </div>
  );
}
