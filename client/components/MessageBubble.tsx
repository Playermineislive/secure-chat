import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage } from '@shared/api';
import { useTranslation } from '../contexts/TranslationContext';
import { 
  Download, 
  Image as ImageIcon, 
  FileText, 
  Globe, 
  Copy, 
  Reply, 
  MoreHorizontal, 
  Check, 
  CheckCheck, 
  Play,
  Music,
  Code,
  FileVideo,
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  onReact?: (emoji: string) => void;
  onImageClick?: (imageUrl: string) => void;
  onReply?: (message: ChatMessage) => void;
}

// Helper: Auto-detect links in text
const LinkifiedText = ({ text }: { text: string }) => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return (
    <span>
      {parts.map((part, i) => 
        urlRegex.test(part) ? (
          <a 
            key={i} 
            href={part} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-200 underline hover:text-white transition-colors inline-flex items-center gap-0.5 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part} <ExternalLink className="w-3 h-3 opacity-70" />
          </a>
        ) : (
          part
        )
      )}
    </span>
  );
};

const MessageBubble = memo(({ message, isOwn, onReact, onImageClick, onReply }: MessageBubbleProps) => {
  // State
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');
  const [isHovered, setIsHovered] = useState(false);

  // Context
  const { isTranslationEnabled, targetLanguage, translateMessage, getLanguageByCode } = useTranslation();

  // --- 1. Content Parsing ---
  const textContent = useMemo(() => {
    if (typeof message.content === 'string') return message.content;
    if (message.type === 'text' && typeof message.content === 'object') return JSON.stringify(message.content);
    return null;
  }, [message]);

  const mediaContent = useMemo(() => {
    if (message.type !== 'text' && typeof message.content === 'object') return message.content as any;
    return message.media;
  }, [message]);

  // --- 2. Auto-Translate Logic ---
  useEffect(() => {
    if (isTranslationEnabled && !isOwn && textContent && !translatedText) {
      handleTranslate();
    }
  }, [isTranslationEnabled, isOwn, textContent]);

  const handleTranslate = useCallback(async () => {
    if (!textContent || isTranslating) return;
    setIsTranslating(true);
    try {
      const result = await translateMessage(textContent, targetLanguage);
      if (result) {
        setTranslatedText(result.translatedText);
        setShowTranslation(true);
      }
    } catch (e) {
      console.error("Translation error", e);
    } finally {
      setIsTranslating(false);
    }
  }, [textContent, targetLanguage, translateMessage]);

  const handleCopy = useCallback(async () => {
    const textToCopy = showTranslation && translatedText ? translatedText : textContent || '';
    if (!textToCopy) return;
    
    await navigator.clipboard.writeText(textToCopy);
    setCopyStatus('copied');
    setTimeout(() => setCopyStatus('idle'), 2000);
  }, [textContent, translatedText, showTranslation]);

  // --- 3. File Icon Logic ---
  const getFileIcon = (fileName: string = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['mp3', 'wav', 'ogg'].includes(ext!)) return <Music className="w-5 h-5 text-purple-600" />;
    if (['mp4', 'mov', 'avi'].includes(ext!)) return <FileVideo className="w-5 h-5 text-rose-600" />;
    if (['js', 'ts', 'tsx', 'py', 'json'].includes(ext!)) return <Code className="w-5 h-5 text-slate-600" />;
    return <FileText className="w-5 h-5 text-indigo-600" />;
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={cn("group relative max-w-[85%] sm:max-w-[70%]", isOwn ? "ml-auto" : "mr-auto")}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={cn(
          "relative px-4 py-3 shadow-sm text-[15px] leading-relaxed break-words transition-all duration-200 border",
          isOwn 
            ? "bg-indigo-600 text-white border-indigo-500 rounded-[20px] rounded-tr-md" 
            : "bg-white text-slate-800 border-slate-200 rounded-[20px] rounded-tl-md"
        )}
      >
        {/* --- A. Media Rendering --- */}
        {mediaContent && (
          <div className="mb-3 -mx-1 mt-[-4px]">
            {message.type === 'image' ? (
              <div 
                className="relative overflow-hidden rounded-xl cursor-pointer bg-black/5 group/image"
                onClick={() => onImageClick?.(mediaContent.data)}
              >
                <img 
                  src={mediaContent.data} 
                  alt="Attachment" 
                  className="max-w-full h-auto object-cover hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors" />
              </div>
            ) : (
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl border transition-colors", 
                isOwn 
                  ? "bg-indigo-700/50 border-indigo-500/50" 
                  : "bg-slate-50 border-slate-100 hover:bg-slate-100"
              )}>
                <div className="p-2.5 bg-white rounded-lg shadow-sm shrink-0">
                  {getFileIcon(mediaContent.fileName)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn("font-medium truncate text-sm", isOwn ? "text-white" : "text-slate-900")}>
                    {mediaContent.fileName || 'Unknown File'}
                  </p>
                  <p className={cn("text-[11px]", isOwn ? "text-indigo-200" : "text-slate-500")}>
                    {mediaContent.fileSize ? `${(mediaContent.fileSize / 1024).toFixed(1)} KB` : 'File'}
                  </p>
                </div>
                <button className={cn(
                  "p-2 rounded-full transition-all shrink-0", 
                  isOwn ? "hover:bg-indigo-500 text-white" : "hover:bg-white text-slate-600 shadow-sm"
                )}>
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* --- B. Text Content --- */}
        {textContent && (
          <div className="whitespace-pre-wrap relative z-10">
            {showTranslation && translatedText ? (
              <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }}
                className="italic text-[15px]"
              >
                {translatedText}
              </motion.div>
            ) : (
              <LinkifiedText text={textContent} />
            )}
          </div>
        )}

        {/* --- C. Translation Footer (Optional) --- */}
        <AnimatePresence>
          {showTranslation && translatedText && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "mt-2 pt-2 border-t text-xs flex items-center justify-between",
                isOwn ? "border-indigo-500/30 text-indigo-200" : "border-slate-100 text-slate-500"
              )}
            >
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3" />
                <span>Translated from {getLanguageByCode(targetLanguage)?.name || 'Auto'}</span>
              </div>
              <button 
                onClick={() => setShowTranslation(false)}
                className="hover:underline opacity-80 hover:opacity-100"
              >
                Show Original
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- D. Metadata Footer --- */}
        <div className={cn(
          "flex items-center justify-end gap-1.5 mt-1.5 text-[10px] select-none",
          isOwn ? "text-indigo-200" : "text-slate-400"
        )}>
          {isTranslating && <RefreshCw className="w-3 h-3 animate-spin" />}
          <span className="opacity-90">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          {isOwn && (
            <span title="Read">
              <CheckCheck className="w-3.5 h-3.5 opacity-90" />
            </span>
          )}
        </div>
      </div>

      {/* --- E. Floating Action Menu (Hover) --- */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className={cn(
              "absolute -top-10 flex items-center gap-1 p-1 bg-white rounded-full shadow-lg border border-slate-100 z-20",
              isOwn ? "right-0" : "left-0"
            )}
          >
            <ActionBtn 
              icon={Reply} 
              label="Reply" 
              onClick={() => onReply?.(message)} 
            />
            <ActionBtn 
              icon={copyStatus === 'copied' ? Check : Copy} 
              label={copyStatus === 'copied' ? "Copied" : "Copy"}
              onClick={handleCopy}
              active={copyStatus === 'copied'}
            />
            {!isOwn && textContent && (
              <ActionBtn 
                icon={Globe} 
                label={showTranslation ? "Original" : "Translate"}
                onClick={() => isTranslating ? null : (showTranslation ? setShowTranslation(false) : handleTranslate())}
                active={showTranslation}
              />
            )}
            <div className="w-px h-4 bg-slate-200 mx-0.5" />
            <ActionBtn icon={MoreHorizontal} label="More" onClick={() => {}} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});

// --- Helper Components ---

const ActionBtn = ({ icon: Icon, onClick, active, label }: any) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className={cn(
      "p-2 rounded-full transition-all duration-200 group relative",
      active 
        ? "bg-green-50 text-green-600 hover:bg-green-100" 
        : "hover:bg-slate-100 text-slate-500 hover:text-indigo-600"
    )}
    title={label}
  >
    <Icon className="w-4 h-4" />
  </button>
);

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
