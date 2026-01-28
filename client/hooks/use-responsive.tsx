import { useState, useEffect, useCallback, useMemo } from 'react';

// --- Configuration: Material Design 3 Breakpoints ---
export const BREAKPOINTS = {
  xs: 0,
  sm: 600,  // Mobile Landscape
  md: 900,  // Tablet Portrait
  lg: 1200, // Tablet Landscape / Laptop
  xl: 1536, // Desktop
};

// --- Types ---
export interface BreakpointValues {
  xs: boolean;
  sm: boolean;
  md: boolean;
  lg: boolean;
  xl: boolean;
}

export interface ResponsiveInfo {
  breakpoints: BreakpointValues;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
  width: number;
  height: number;
  orientation: 'portrait' | 'landscape';
  isOnline: boolean;
  devicePixelRatio: number;
  // Device Capabilities
  isTouchDevice: boolean;
  supportsHover: boolean;
  prefersReducedMotion: boolean;
}

// --- Helper: High-Performance Media Query Hook ---
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const media = window.matchMedia(query);
    // Set initial value
    setMatches(media.matches);

    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    
    // Modern browsers
    if (media.addEventListener) {
      media.addEventListener('change', listener);
      return () => media.removeEventListener('change', listener);
    } 
    // Fallback for older Safari
    else {
      media.addListener(listener);
      return () => media.removeListener(listener);
    }
  }, [query]);

  return matches;
}

// --- Core Hook: useResponsive ---
export function useResponsive(): ResponsiveInfo {
  // 1. Efficient Breakpoint Detection (No resize listeners)
  const isMobile = useMediaQuery(`(max-width: ${BREAKPOINTS.sm - 0.05}px)`);
  const isTablet = useMediaQuery(`(min-width: ${BREAKPOINTS.sm}px) and (max-width: ${BREAKPOINTS.lg - 0.05}px)`);
  const isDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`);
  const isLargeDesktop = useMediaQuery(`(min-width: ${BREAKPOINTS.xl}px)`);

  // 2. Window Dimensions (Debounced)
  const [dimensions, setDimensions] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let timeoutId: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setDimensions({
          width: window.innerWidth,
          height: window.innerHeight
        });
      }, 150); // 150ms debounce
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeoutId);
    };
  }, []);

  // 3. Network Status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const setOnline = () => setIsOnline(true);
    const setOffline = () => setIsOnline(false);
    window.addEventListener('online', setOnline);
    window.addEventListener('offline', setOffline);
    return () => {
      window.removeEventListener('online', setOnline);
      window.removeEventListener('offline', setOffline);
    };
  }, []);

  // 4. Capabilities (Media Queries)
  const supportsHover = useMediaQuery('(hover: hover)');
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  
  // Touch detection
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const orientation = dimensions.width > dimensions.height ? 'landscape' : 'portrait';

  return {
    breakpoints: {
      xs: true,
      sm: dimensions.width >= BREAKPOINTS.sm,
      md: dimensions.width >= BREAKPOINTS.md,
      lg: dimensions.width >= BREAKPOINTS.lg,
      xl: dimensions.width >= BREAKPOINTS.xl,
    },
    isMobile,
    isTablet,
    isDesktop,
    isLargeDesktop,
    width: dimensions.width,
    height: dimensions.height,
    orientation,
    isOnline,
    devicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    isTouchDevice,
    supportsHover,
    prefersReducedMotion
  };
}

// --- Hook 2: useViewport (UI Layout & Safe Areas) ---
export function useViewport() {
  const responsive = useResponsive();

  const getOptimalImageSize = useCallback(() => {
    if (responsive.isMobile) return 'small';
    if (responsive.isTablet) return 'medium';
    return 'large';
  }, [responsive.isMobile, responsive.isTablet]);

  const getOptimalVideoQuality = useCallback(() => {
    if (responsive.isMobile) return '480p';
    if (responsive.isTablet) return '720p';
    return '1080p';
  }, [responsive.isMobile, responsive.isTablet]);

  const getSafeAreaInsets = useCallback(() => {
    if (typeof window === 'undefined') return { top: '0px', bottom: '0px', left: '0px', right: '0px' };
    const style = getComputedStyle(document.documentElement);
    return {
      top: style.getPropertyValue('env(safe-area-inset-top)') || '0px',
      right: style.getPropertyValue('env(safe-area-inset-right)') || '0px',
      bottom: style.getPropertyValue('env(safe-area-inset-bottom)') || '0px',
      left: style.getPropertyValue('env(safe-area-inset-left)') || '0px'
    };
  }, []);

  const getOptimalChatLayout = useCallback(() => {
    if (responsive.isMobile) {
      return {
        messageMaxWidth: '85%',
        showSidebar: false,
        stackVertically: true,
        compactMode: true,
        showQuickActions: false
      };
    }
    if (responsive.isTablet) {
      return {
        messageMaxWidth: '75%',
        showSidebar: responsive.orientation === 'landscape',
        stackVertically: false,
        compactMode: true,
        showQuickActions: true
      };
    }
    // Desktop
    return {
      messageMaxWidth: '65%',
      showSidebar: true,
      stackVertically: false,
      compactMode: false,
      showQuickActions: true
    };
  }, [responsive.isMobile, responsive.isTablet, responsive.orientation]);

  return {
    ...responsive,
    getOptimalImageSize,
    getOptimalVideoQuality,
    getSafeAreaInsets,
    shouldUseAnimation: !responsive.prefersReducedMotion && responsive.isOnline,
    getOptimalChatLayout
  };
}

// --- Hook 3: usePerformanceOptimization (Loading & Rendering) ---
export function usePerformanceOptimization() {
  const responsive = useResponsive();
  
  // Derived state
  const shouldLazyLoad = responsive.isMobile || !responsive.isOnline;
  const shouldReduceAnimations = responsive.prefersReducedMotion || (responsive.isMobile && responsive.devicePixelRatio < 2);
  const shouldOptimizeImages = responsive.isMobile || responsive.devicePixelRatio < 2;
  const shouldUseVirtualization = responsive.isMobile; // Always virtualize lists on mobile

  const getOptimalBatchSize = useCallback(() => {
    if (responsive.isMobile) return 15;
    if (responsive.isTablet) return 30;
    return 50;
  }, [responsive.isMobile, responsive.isTablet]);

  const shouldPreloadContent = useCallback(() => {
    return responsive.isOnline && !responsive.isMobile;
  }, [responsive.isOnline, responsive.isMobile]);

  return {
    shouldLazyLoad,
    shouldReduceAnimations,
    shouldOptimizeImages,
    shouldUseVirtualization,
    getOptimalBatchSize,
    shouldPreloadContent
  };
}

// --- Hook 4: useAccessibility (A11y preferences) ---
export function useAccessibility() {
  const responsive = useResponsive();
  
  // Media Queries for A11y
  const highContrastMode = useMediaQuery('(prefers-contrast: high)');
  const largeTextMode = useMediaQuery('(prefers-reduced-data: reduce)'); // Proxy for "Data Saver" often used with accessibility

  const getAccessibleTapTargetSize = useCallback(() => {
    return responsive.isTouchDevice ? '48px' : '32px'; // WCAG Standards
  }, [responsive.isTouchDevice]);

  const shouldUseLargeText = largeTextMode || responsive.isMobile;

  const getOptimalFontSize = useCallback(() => {
    if (shouldUseLargeText) {
      return { xs: '16px', sm: '18px', base: '20px', lg: '24px', xl: '30px' };
    }
    return { xs: '14px', sm: '16px', base: '16px', lg: '18px', xl: '24px' };
  }, [shouldUseLargeText]);

  return {
    highContrastMode,
    largeTextMode,
    getAccessibleTapTargetSize,
    shouldUseLargeText,
    getOptimalFontSize,
    shouldShowTooltips: !responsive.isTouchDevice && responsive.supportsHover,
    shouldUseVoiceOver: responsive.isTouchDevice // Heuristic
  };
}

// --- Hook 5: useNetworkOptimization (Connection aware) ---
export function useNetworkOptimization() {
  const responsive = useResponsive();
  
  const [connection, setConnection] = useState<any>(null);

  useEffect(() => {
    // Network Information API (Chrome/Edge/Android)
    const conn = (navigator as any).connection || 
                 (navigator as any).mozConnection || 
                 (navigator as any).webkitConnection;
    
    if (conn) {
      setConnection({
        type: conn.type,
        effectiveType: conn.effectiveType,
        saveData: conn.saveData
      });

      const updateConnection = () => {
        setConnection({
          type: conn.type,
          effectiveType: conn.effectiveType,
          saveData: conn.saveData
        });
      };

      conn.addEventListener('change', updateConnection);
      return () => conn.removeEventListener('change', updateConnection);
    }
  }, []);

  // Defaults if API unavailable
  const effectiveType = connection?.effectiveType || '4g';
  const isSlowConnection = effectiveType === '2g' || effectiveType === 'slow-2g';
  const isFastConnection = effectiveType === '4g' || effectiveType === '5g'; // 5g isn't standard spec yet but future proofing

  const shouldCompressImages = isSlowConnection || !responsive.isOnline || connection?.saveData;
  const shouldReduceQuality = isSlowConnection || connection?.saveData;
  const shouldPrefetchContent = isFastConnection && responsive.isOnline && !connection?.saveData;

  const getOptimalImageFormat = useCallback(() => {
    if (isSlowConnection) return 'webp'; // Smaller
    if (isFastConnection) return 'avif'; // High quality
    return 'jpeg'; // Safe default
  }, [isSlowConnection, isFastConnection]);

  const getOptimalVideoSettings = useCallback(() => ({
    autoplay: isFastConnection && !connection?.saveData,
    preload: isFastConnection ? 'auto' : 'metadata',
    quality: isSlowConnection ? 'low' : 'high'
  }), [isFastConnection, isSlowConnection, connection?.saveData]);

  return {
    connectionType: connection?.type || 'unknown',
    effectiveType,
    isSlowConnection,
    isFastConnection,
    shouldCompressImages,
    shouldReduceQuality,
    shouldPrefetchContent,
    getOptimalImageFormat,
    getOptimalVideoSettings,
    isOnline: responsive.isOnline
  };
}
