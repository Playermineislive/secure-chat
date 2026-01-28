import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { translationService, Language, TranslationResult, SUPPORTED_LANGUAGES } from '../services/translationService';

// --- Configuration ---
const CACHE_LIMIT = 500; // Max stored translations
const RETRY_ATTEMPTS = 2;

// --- Types ---
export interface TranslationSettings {
  enabled: boolean;
  targetLanguage: string;
  autoDetect: boolean;
  showOriginal: boolean;
  translateIncoming: boolean;
  translateOutgoing: boolean;
}

interface TranslationContextType {
  settings: TranslationSettings;
  updateSettings: (newSettings: Partial<TranslationSettings>) => void;
  translateMessage: (text: string, fromLang?: string) => Promise<TranslationResult | null>;
  getSupportedLanguages: () => Language[];
  getLanguageByCode: (code: string) => Language | undefined;
  
  // State
  isTranslating: boolean;
  translationCache: Map<string, TranslationResult>; // Exposed for debugging
  clearCache: () => void;
  
  // Helpers
  toggleTranslation: () => void;
  isLanguageSupported: (code: string) => boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

// --- Provider ---
export const TranslationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State
  const [settings, setSettings] = useState<TranslationSettings>({
    enabled: false,
    targetLanguage: 'en',
    autoDetect: true,
    showOriginal: true,
    translateIncoming: true,
    translateOutgoing: false
  });

  const [isTranslating, setIsTranslating] = useState(false);
  
  // LRU Cache Implementation (Ref-based to avoid re-renders on cache hits)
  const cacheRef = React.useRef(new Map<string, TranslationResult>());

  // 1. Load Settings
  useEffect(() => {
    try {
      const saved = localStorage.getItem('translationSettings');
      if (saved) {
        setSettings(prev => ({ ...prev, ...JSON.parse(saved) }));
      } else {
        // Auto-detect browser language for default target
        const browserLang = navigator.language.split('-')[0];
        if (SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
          setSettings(prev => ({ ...prev, targetLanguage: browserLang }));
        }
      }
    } catch (e) {
      console.error('Failed to load translation settings', e);
    }
  }, []);

  // 2. Persist Settings
  useEffect(() => {
    localStorage.setItem('translationSettings', JSON.stringify(settings));
  }, [settings]);

  // --- Actions ---

  const updateSettings = useCallback((newSettings: Partial<TranslationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const toggleTranslation = useCallback(() => {
    setSettings(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    translationService.clearCache();
  }, []);

  // --- Core Translation Logic (Optimized) ---

  const translateMessage = useCallback(async (text: string, fromLang?: string): Promise<TranslationResult | null> => {
    if (!settings.enabled || !text?.trim()) return null;

    // 1. Generate Cache Key
    const sourceLang = settings.autoDetect ? 'auto' : (fromLang || 'auto');
    const targetLang = settings.targetLanguage;
    const cacheKey = `${sourceLang}:${targetLang}:${text.trim()}`;

    // 2. Check Cache (Immediate Return)
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey)!;
    }

    // 3. LRU Eviction Policy
    if (cacheRef.current.size >= CACHE_LIMIT) {
      const firstKey = cacheRef.current.keys().next().value;
      if (firstKey) cacheRef.current.delete(firstKey);
    }

    setIsTranslating(true);

    // 4. Execute with Retry Logic
    let attempts = 0;
    while (attempts <= RETRY_ATTEMPTS) {
      try {
        const result = await translationService.translate(text, sourceLang, targetLang);
        
        // Cache Success
        cacheRef.current.set(cacheKey, result);
        setIsTranslating(false);
        return result;

      } catch (error) {
        attempts++;
        if (attempts > RETRY_ATTEMPTS) {
          console.error(`Translation failed after ${attempts} attempts:`, error);
          setIsTranslating(false);
          return null; // Fail gracefully
        }
        // Exponential backoff wait: 200ms, 400ms...
        await new Promise(r => setTimeout(r, 200 * attempts));
      }
    }
    
    return null;
  }, [settings.enabled, settings.targetLanguage, settings.autoDetect]);

  // --- Helpers ---

  const getSupportedLanguages = useCallback(() => SUPPORTED_LANGUAGES, []);
  
  const getLanguageByCode = useCallback((code: string) => 
    SUPPORTED_LANGUAGES.find(l => l.code === code), 
  []);

  const isLanguageSupported = useCallback((code: string) => 
    SUPPORTED_LANGUAGES.some(l => l.code === code), 
  []);

  // --- Memoized Context Value ---
  const value = useMemo(() => ({
    settings,
    updateSettings,
    toggleTranslation,
    translateMessage,
    getSupportedLanguages,
    getLanguageByCode,
    isLanguageSupported,
    isTranslating,
    translationCache: cacheRef.current,
    clearCache
  }), [
    settings, 
    updateSettings, 
    toggleTranslation, 
    translateMessage, 
    getSupportedLanguages, 
    getLanguageByCode, 
    isLanguageSupported, 
    isTranslating, 
    clearCache
  ]);

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = (): TranslationContextType => {
  const context = useContext(TranslationContext);
  if (!context) throw new Error('useTranslation must be used within a TranslationProvider');
  return context;
};
