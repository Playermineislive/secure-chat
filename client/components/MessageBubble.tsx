import React, { useState, useEffect, useCallback, memo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChatMessage, MediaContent } from "@shared/api";
import { useTranslation } from "../contexts/TranslationContext";
import { useTheme } from "../contexts/ThemeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Download,
  Play,
  Image as ImageIcon,
  FileText,
  ShieldCheck,
  AlertCircle,
  Eye,
  Languages,
  Volume2,
  Copy,
  MoreHorizontal,
  Globe,
  Heart,
  Star,
  Sparkles,
  Clock,
  Check,
  CheckCheck,
  Edit,
  Reply,
  Forward,
} from "lucide-react";

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onReact?: (emoji: string) => void;
  onImageClick?: (imageUrl: string) => void;
}

// Memoized component for better performance
const MessageBubble = memo(
  ({ message, isOwn, onReact, onImageClick }: MessageBubbleProps) => {
    const { currentTheme } = useTheme();
    const [imageLoaded, setImageLoaded] = useState(false);
    const [imageError, setImageError] = useState(false);
    const [showTranslation, setShowTranslation] = useState(false);
    const [translatedText, setTranslatedText] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [textCopied, setTextCopied] = useState(false);

    const {
      isTranslationEnabled,
      targetLanguage,
      translateMessage,
      getLanguageByCode,
    } = useTranslation();

    // Auto-translate incoming messages if enabled
    useEffect(() => {
      if (
        isTranslationEnabled &&
        !isOwn &&
        message.content &&
        !translatedText
      ) {
        handleTranslate();
      }
    }, [isTranslationEnabled, isOwn, message.content, translatedText]);

    const handleTranslate = useCallback(async () => {
      if (!message.content || isTranslating) return;

      setIsTranslating(true);
      try {
        const translated = await translateMessage(
          message.content,
          targetLanguage,
        );
        setTranslatedText(translated);
        setShowTranslation(true);
      } catch (error) {
        console.error("Translation failed:", error);
      } finally {
        setIsTranslating(false);
      }
    }, [message.content, isTranslating, translateMessage, targetLanguage]);

    const handleCopyText = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setTextCopied(true);
        setTimeout(() => setTextCopied(false), 2000);
      } catch (error) {
        console.error("Failed to copy text:", error);
      }
    }, [message.content]);

    const handleImageLoad = useCallback(() => {
      setImageLoaded(true);
    }, []);

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    const formatTime = (timestamp: number) => {
      return new Date(timestamp).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const getFileIcon = (fileName: string) => {
      const extension = fileName.split(".").pop()?.toLowerCase();
      if (["jpg", "jpeg", "png", "gif", "webp"].includes(extension || "")) {
        return ImageIcon;
      }
      return FileText;
    };

    const messageActions = [
      { icon: Reply, label: "Reply", action: () => console.log("Reply") },
      { icon: Forward, label: "Forward", action: () => console.log("Forward") },
      { icon: Copy, label: "Copy", action: handleCopyText },
      { icon: Languages, label: "Translate", action: handleTranslate },
      { icon: Star, label: "Star", action: () => console.log("Star") },
    ];

    return (
      <motion.div
        className="relative group"
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        layout
      >
        {/* Message container */}
        <motion.div
          className={`relative p-4 ${currentTheme.bubbleStyle.backdrop} border border-white/20 overflow-hidden ${currentTheme.bubbleStyle.borderRadius} ${currentTheme.bubbleStyle.shadow} ${
            isOwn
              ? `${currentTheme.messageColors.sent} ${currentTheme.messageColors.sentText} ml-auto`
              : `${currentTheme.messageColors.received} ${currentTheme.messageColors.receivedText} mr-auto`
          }`}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{
            duration: 0.3,
            type: "spring",
            bounce: 0.3,
          }}
          whileHover={{
            scale: 1.02,
            y: -2,
            transition: { duration: 0.2 },
          }}
        >
          {/* Animated shimmer effect */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
            animate={{
              x: [-100, 200],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          {/* Message content */}
          <div className="relative z-10">
            {/* File/Media content */}
            {message.media && (
              <motion.div
                className="mb-3"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                {message.media.type === "image" ? (
                  <motion.div
                    className="relative rounded-[1.5rem] overflow-hidden cursor-pointer"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onImageClick?.(message.media!.url)}
                  >
                    {!imageLoaded && !imageError && (
                      <div className="w-48 h-32 bg-white/10 rounded-[1.5rem] flex items-center justify-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <ImageIcon className="w-6 h-6 text-white/60" />
                        </motion.div>
                      </div>
                    )}

                    {imageError ? (
                      <div className="w-48 h-32 bg-red-500/20 rounded-[1.5rem] flex items-center justify-center border border-red-400/50">
                        <AlertCircle className="w-6 h-6 text-red-400" />
                      </div>
                    ) : (
                      <img
                        src={message.media.url}
                        alt="Shared image"
                        className="max-w-xs rounded-[1.5rem] shadow-lg"
                        onLoad={handleImageLoad}
                        onError={handleImageError}
                        style={{ display: imageLoaded ? "block" : "none" }}
                      />
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    className="flex items-center space-x-3 p-3 bg-white/10 rounded-[1.5rem] border border-white/20"
                    whileHover={{ scale: 1.02 }}
                  >
                    {React.createElement(getFileIcon(message.media.fileName), {
                      className: "w-8 h-8 text-white/70 flex-shrink-0",
                    })}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {message.media.fileName}
                      </p>
                      <p className="text-white/60 text-sm">
                        {message.media.size} bytes
                      </p>
                    </div>
                    <motion.button
                      className="p-2 bg-white/10 hover:bg-white/20 rounded-[1rem] transition-colors"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Download className="w-4 h-4 text-white/70" />
                    </motion.button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Text content */}
            {message.content && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-white leading-relaxed break-words">
                  {message.content}
                </p>

                {/* Translation */}
                <AnimatePresence>
                  {showTranslation && translatedText && (
                    <motion.div
                      className="mt-3 p-3 bg-white/10 rounded-[1.5rem] border border-white/20"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <Globe className="w-4 h-4 text-blue-400" />
                        <span className="text-white/70 text-xs font-medium">
                          Translated to{" "}
                          {getLanguageByCode(targetLanguage)?.name}
                        </span>
                      </div>
                      <p className="text-white/90 text-sm leading-relaxed">
                        {translatedText}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Translation loading */}
                {isTranslating && (
                  <motion.div
                    className="mt-2 flex items-center space-x-2 text-white/60"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                    >
                      <Languages className="w-4 h-4" />
                    </motion.div>
                    <span className="text-xs">Translating...</span>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Message metadata */}
            <motion.div
              className="flex items-center justify-between mt-3 pt-2 border-t border-white/10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center space-x-2">
                <Clock className="w-3 h-3 text-white/50" />
                <span className="text-white/50 text-xs">
                  {formatTime(message.timestamp)}
                </span>

                {/* Encryption indicator */}
                <motion.div
                  className="flex items-center space-x-1"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ShieldCheck className="w-3 h-3 text-green-400" />
                </motion.div>
              </div>

              {/* Message status for own messages */}
              {isOwn && (
                <motion.div
                  className="flex items-center space-x-1"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: "spring" }}
                >
                  <CheckCheck className="w-4 h-4 text-blue-400" />
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Hover actions */}
          <AnimatePresence>
            {isHovered && (
              <motion.div
                className={`absolute top-0 ${isOwn ? "left-0" : "right-0"} transform ${
                  isOwn ? "-translate-x-full" : "translate-x-full"
                } flex flex-col space-y-1 p-2`}
                initial={{ opacity: 0, x: isOwn ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: isOwn ? 20 : -20 }}
                transition={{ duration: 0.2 }}
              >
                {messageActions.slice(0, 3).map((action, index) => (
                  <motion.button
                    key={index}
                    onClick={action.action}
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-[0.8rem] flex items-center justify-center text-white/70 hover:text-white transition-all duration-200 backdrop-blur-sm"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    title={action.label}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <action.icon className="w-4 h-4" />
                  </motion.button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Copy confirmation */}
          <AnimatePresence>
            {textCopied && (
              <motion.div
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500/20 backdrop-blur-md border border-green-400/50 text-green-300 px-3 py-1 rounded-[1rem] text-xs font-medium"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
              >
                Copied!
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Reaction button */}
        {onReact && (
          <motion.button
            className={`absolute -bottom-2 ${isOwn ? "left-4" : "right-4"} w-6 h-6 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white transition-all duration-200 backdrop-blur-sm opacity-0 group-hover:opacity-100`}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.8 }}
            onClick={() => onReact("❤️")}
          >
            <Heart className="w-3 h-3" />
          </motion.button>
        )}
      </motion.div>
    );
  },
);

MessageBubble.displayName = "MessageBubble";

export default MessageBubble;
