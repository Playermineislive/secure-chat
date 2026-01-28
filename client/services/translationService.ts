import axios, { AxiosError } from 'axios';

// --- Types & Interfaces ---

export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  dir?: 'ltr' | 'rtl';
}

export interface TranslationRequest {
  text: string;
  from?: string; // 'auto' or code
  to: string;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  fromLanguage: string;
  toLanguage: string;
  confidence: number;
  provider: string; // Traceability
  cached: boolean;
}

export interface TranslationProvider {
  name: string;
  translate(req: TranslationRequest): Promise<TranslationResult>;
  detect(text: string): Promise<string>;
  isHealthy(): Promise<boolean>;
}

// --- Configuration ---
const CONFIG = {
  CACHE_SIZE: 1000,
  REQUEST_TIMEOUT: 5000,
  MAX_RETRIES: 3,
  BATCH_CONCURRENCY: 5,
  // Public APIs for demo (Replace with paid keys in production)
  ENDPOINTS: {
    LIBRE: 'https://libretranslate.de/translate',
    MYMEMORY: 'https://api.mymemory.translated.net/get'
  }
};

// --- Language Definitions ---
export const SUPPORTED_LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸', dir: 'ltr' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸', dir: 'ltr' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷', dir: 'ltr' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪', dir: 'ltr' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹', dir: 'ltr' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇵🇹', dir: 'ltr' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺', dir: 'ltr' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵', dir: 'ltr' },
  { code: 'ko', name: 'Korean', nativeName: '한국어', flag: '🇰🇷', dir: 'ltr' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳', dir: 'ltr' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', flag: '🇮🇳', dir: 'ltr' },
];

// --- Utilities ---

/**
 * Least Recently Used (LRU) Cache
 * Prevents memory leaks by limiting the number of stored translations.
 */
class LRUCache<K, V> {
  private values: Map<K, V> = new Map<K, V>();
  private maxEntries: number;

  constructor(maxEntries: number = CONFIG.CACHE_SIZE) {
    this.maxEntries = maxEntries;
  }

  public get(key: K): V | undefined {
    const entry = this.values.get(key);
    if (entry) {
      // Peek: re-insert to update "recently used" status
      this.values.delete(key);
      this.values.set(key, entry);
    }
    return entry;
  }

  public set(key: K, value: V) {
    if (this.values.size >= this.maxEntries) {
      // Evict oldest (first inserted)
      const keyToDelete = this.values.keys().next().value;
      if (keyToDelete) this.values.delete(keyToDelete);
    }
    this.values.set(key, value);
  }

  public clear() {
    this.values.clear();
  }
}

// --- Providers (Strategy Pattern) ---

class LibreTranslateProvider implements TranslationProvider {
  name = "LibreTranslate (Public)";

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    try {
      const { data } = await axios.post(CONFIG.ENDPOINTS.LIBRE, {
        q: req.text,
        source: req.from === 'auto' ? undefined : req.from, // Libre auto-detects if omitted
        target: req.to,
        format: 'text'
      }, { timeout: CONFIG.REQUEST_TIMEOUT });

      return {
        originalText: req.text,
        translatedText: data.translatedText,
        fromLanguage: req.from || 'auto',
        toLanguage: req.to,
        confidence: 0.9,
        provider: this.name,
        cached: false
      };
    } catch (e) {
      throw new Error(`LibreTranslate failed: ${(e as Error).message}`);
    }
  }

  async detect(text: string): Promise<string> {
    // Basic heuristic fallback if API unavailable
    return 'en'; 
  }

  async isHealthy(): Promise<boolean> {
    try {
      // Simple ping (replace with actual health endpoint if available)
      return true; 
    } catch { return false; }
  }
}

class MyMemoryProvider implements TranslationProvider {
  name = "MyMemory API";

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    const source = req.from === 'auto' ? '' : req.from;
    const pair = source ? `${source}|${req.to}` : `|${req.to}`; // Auto-detect format

    const { data } = await axios.get(CONFIG.ENDPOINTS.MYMEMORY, {
      params: { q: req.text, langpair: pair },
      timeout: CONFIG.REQUEST_TIMEOUT
    });

    if (data.responseStatus !== 200) throw new Error(data.responseDetails);

    return {
      originalText: req.text,
      translatedText: data.responseData.translatedText,
      fromLanguage: req.from || 'auto',
      toLanguage: req.to,
      confidence: data.responseData.match,
      provider: this.name,
      cached: false
    };
  }

  async detect(text: string): Promise<string> { return 'en'; }
  async isHealthy(): Promise<boolean> { return true; }
}

class OfflineFallbackProvider implements TranslationProvider {
  name = "Offline Dictionary";
  
  // A tiny static dictionary for demo purposes when internet is down
  private dictionary: Record<string, Record<string, string>> = {
    'hello': { 'es': 'hola', 'fr': 'bonjour', 'de': 'hallo', 'ja': 'こんにちは' },
    'thank you': { 'es': 'gracias', 'fr': 'merci', 'de': 'danke', 'ja': 'ありがとう' },
    'yes': { 'es': 'sí', 'fr': 'oui', 'de': 'ja', 'ja': 'はい' },
    'no': { 'es': 'no', 'fr': 'non', 'de': 'nein', 'ja': 'いいえ' },
  };

  async translate(req: TranslationRequest): Promise<TranslationResult> {
    const lower = req.text.toLowerCase().trim();
    const exactMatch = this.dictionary[lower]?.[req.to];

    return {
      originalText: req.text,
      translatedText: exactMatch || `[${req.to}: ${req.text}]`,
      fromLanguage: req.from || 'auto',
      toLanguage: req.to,
      confidence: exactMatch ? 1.0 : 0.1,
      provider: this.name,
      cached: false
    };
  }

  async detect(text: string): Promise<string> { return 'en'; }
  async isHealthy(): Promise<boolean> { return true; }
}

// --- Main Service ---

export class TranslationService {
  private providers: TranslationProvider[];
  private cache: LRUCache<string, TranslationResult>;
  private circuitOpen: boolean = false;

  constructor() {
    this.cache = new LRUCache(CONFIG.CACHE_SIZE);
    // Priority order: 1. Libre (Best), 2. MyMemory (Backup), 3. Offline (Last Resort)
    this.providers = [
      new LibreTranslateProvider(),
      new MyMemoryProvider(),
      new OfflineFallbackProvider()
    ];
  }

  private getCacheKey(req: TranslationRequest): string {
    return `${req.from || 'auto'}:${req.to}:${req.text.trim()}`;
  }

  /**
   * Smart Translation with Fallback Chain
   */
  async translate(text: string, from: string = 'auto', to: string = 'en'): Promise<TranslationResult> {
    if (!text?.trim()) return this.createEmptyResult(from, to);
    if (from === to) return this.createIdentityResult(text, from);

    const req: TranslationRequest = { text, from, to };
    const cacheKey = this.getCacheKey(req);

    // 1. Check Cache
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return { ...cached, cached: true };
    }

    // 2. Try Providers sequentially
    let lastError: Error | null = null;

    for (const provider of this.providers) {
      try {
        const result = await provider.translate(req);
        this.cache.set(cacheKey, result);
        return result;
      } catch (error) {
        console.warn(`⚠️ Provider ${provider.name} failed:`, error);
        lastError = error as Error;
        continue; // Try next provider
      }
    }

    // 3. Absolute failure (should technically never happen due to OfflineFallback)
    console.error("All translation providers failed.");
    return {
      originalText: text,
      translatedText: text, // Return original as fail-safe
      fromLanguage: from,
      toLanguage: to,
      confidence: 0,
      provider: 'failed',
      cached: false
    };
  }

  /**
   * Batch Translate with Concurrency Control
   * prevents 429 errors by processing in chunks
   */
  async translateBatch(texts: string[], from: string, to: string): Promise<TranslationResult[]> {
    const results: TranslationResult[] = new Array(texts.length);
    const queue = texts.map((text, index) => ({ text, index }));
    
    // Process queue in chunks
    const processChunk = async () => {
      while (queue.length > 0) {
        const batch = queue.splice(0, CONFIG.BATCH_CONCURRENCY);
        const promises = batch.map(async (item) => {
          try {
            results[item.index] = await this.translate(item.text, from, to);
          } catch (e) {
            results[item.index] = this.createIdentityResult(item.text, from);
          }
        });
        await Promise.all(promises);
      }
    };

    await processChunk();
    return results;
  }

  // --- Helpers ---

  private createEmptyResult(from: string, to: string): TranslationResult {
    return { originalText: '', translatedText: '', fromLanguage: from, toLanguage: to, confidence: 1, provider: 'none', cached: false };
  }

  private createIdentityResult(text: string, lang: string): TranslationResult {
    return { originalText: text, translatedText: text, fromLanguage: lang, toLanguage: lang, confidence: 1, provider: 'identity', cached: false };
  }

  // Detect language locally (Client-Side Heuristic)
  detectLanguageLocal(text: string): string {
    if (/[\u4e00-\u9fff]/.test(text)) return 'zh';
    if (/[\u3040-\u309f\u30a0-\u30ff]/.test(text)) return 'ja';
    if (/[\uac00-\ud7af]/.test(text)) return 'ko';
    if (/[\u0600-\u06ff]/.test(text)) return 'ar';
    if (/[\u0400-\u04ff]/.test(text)) return 'ru';
    return 'en'; // Default
  }

  getLanguageByCode(code: string): Language | undefined {
    return SUPPORTED_LANGUAGES.find(l => l.code === code);
  }
}

export const translationService = new TranslationService();
