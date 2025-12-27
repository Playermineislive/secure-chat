import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

export interface ChatTheme {
  id: string;
  name: string;
  displayName: string;
  description: string;
  background: string;
  pattern?: string;
  messageColors: {
    sent: string;
    received: string;
    sentText: string;
    receivedText: string;
  };
  bubbleStyle: {
    borderRadius: string;
    shadow: string;
    backdrop: string;
  };
  inputStyle: {
    background: string;
    border: string;
    text: string;
    placeholder: string;
  };
  headerStyle: {
    background: string;
    text: string;
    accent: string;
  };
  animations: {
    messageEntry: string;
    typing: string;
    send: string;
  };
  emoji?: string;
  weatherType?: string;
}

const chatThemes: ChatTheme[] = [
  {
    id: "default",
    name: "default",
    displayName: "Default",
    description: "Clean and modern purple gradient",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    messageColors: {
      sent: "bg-blue-500",
      received: "bg-white/10",
      sentText: "text-white",
      receivedText: "text-white",
    },
    bubbleStyle: {
      borderRadius: "rounded-2xl",
      shadow: "shadow-lg",
      backdrop: "backdrop-blur-sm",
    },
    inputStyle: {
      background: "bg-white/10",
      border: "border-white/20",
      text: "text-white",
      placeholder: "placeholder:text-white/60",
    },
    headerStyle: {
      background: "bg-white/10",
      text: "text-white",
      accent: "text-blue-300",
    },
    animations: {
      messageEntry: "animate-slide-in-left",
      typing: "animate-pulse",
      send: "animate-bounce",
    },
    emoji: "💜",
  },
  {
    id: "love",
    name: "love",
    displayName: "Love",
    description: "Romantic pink and red hearts theme",
    background:
      "linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.1'%3E%3Cpath d='M50 20c-8.5 0-15.4 6.9-15.4 15.4 0 4.3 1.8 8.2 4.6 11l10.8 10.8 10.8-10.8c2.8-2.8 4.6-6.7 4.6-11C65.4 26.9 58.5 20 50 20z' fill='%23ff69b4'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-pink-500 to-red-500",
      received: "bg-white/20",
      sentText: "text-white",
      receivedText: "text-pink-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-full",
      shadow: "shadow-pink-500/50 shadow-xl",
      backdrop: "backdrop-blur-md",
    },
    inputStyle: {
      background: "bg-pink-100/30",
      border: "border-pink-300/50",
      text: "text-pink-900",
      placeholder: "placeholder:text-pink-600/60",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-pink-400 to-red-400",
      text: "text-white",
      accent: "text-pink-100",
    },
    animations: {
      messageEntry: "animate-bounce",
      typing: "animate-pulse",
      send: "animate-ping",
    },
    emoji: "💕",
  },
  {
    id: "ocean",
    name: "ocean",
    displayName: "Ocean Breeze",
    description: "Calming ocean waves and blues",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill-opacity='0.1'%3E%3Cpath d='M30 30c0-11 9-20 20-20s20 9 20 20-9 20-20 20-20-9-20-20zm-15 0c0-11 9-20 20-20s20 9 20 20-9 20-20 20-20-9-20-20z' fill='%234FC3F7'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-blue-500 to-cyan-500",
      received: "bg-white/15",
      sentText: "text-white",
      receivedText: "text-blue-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-3xl",
      shadow: "shadow-blue-500/30 shadow-lg",
      backdrop: "backdrop-blur-lg",
    },
    inputStyle: {
      background: "bg-blue-100/20",
      border: "border-blue-300/40",
      text: "text-blue-900",
      placeholder: "placeholder:text-blue-600/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-blue-500 to-cyan-500",
      text: "text-white",
      accent: "text-cyan-200",
    },
    animations: {
      messageEntry: "animate-slide-in-right",
      typing: "animate-bounce",
      send: "animate-pulse",
    },
    emoji: "🌊",
  },
  {
    id: "forest",
    name: "forest",
    displayName: "Forest Green",
    description: "Natural green forest vibes",
    background: "linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill-opacity='0.1'%3E%3Cpath d='M40 10L50 30H30L40 10zM40 30L50 50H30L40 30zM40 50L50 70H30L40 50z' fill='%23228B22'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-green-500 to-emerald-500",
      received: "bg-white/20",
      sentText: "text-white",
      receivedText: "text-green-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-2xl",
      shadow: "shadow-green-500/40 shadow-lg",
      backdrop: "backdrop-blur-sm",
    },
    inputStyle: {
      background: "bg-green-100/25",
      border: "border-green-300/50",
      text: "text-green-900",
      placeholder: "placeholder:text-green-600/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-green-500 to-emerald-500",
      text: "text-white",
      accent: "text-green-200",
    },
    animations: {
      messageEntry: "animate-fade-in-up",
      typing: "animate-bounce",
      send: "animate-scale-in",
    },
    emoji: "🌿",
  },
  {
    id: "sunset",
    name: "sunset",
    displayName: "Sunset Glow",
    description: "Warm sunset oranges and pinks",
    background:
      "linear-gradient(135deg, #ff9a56 0%, #ff6b9d 50%, #c44569 100%)",
    messageColors: {
      sent: "bg-gradient-to-r from-orange-500 to-pink-500",
      received: "bg-white/20",
      sentText: "text-white",
      receivedText: "text-orange-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-3xl",
      shadow: "shadow-orange-500/50 shadow-xl",
      backdrop: "backdrop-blur-md",
    },
    inputStyle: {
      background: "bg-orange-100/30",
      border: "border-orange-300/50",
      text: "text-orange-900",
      placeholder: "placeholder:text-orange-600/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-orange-500 to-pink-500",
      text: "text-white",
      accent: "text-orange-200",
    },
    animations: {
      messageEntry: "animate-slide-in-left",
      typing: "animate-pulse",
      send: "animate-bounce",
    },
    emoji: "🌅",
  },
  {
    id: "galaxy",
    name: "galaxy",
    displayName: "Galaxy",
    description: "Cosmic purple and stars",
    background:
      "linear-gradient(135deg, #2c3e50 0%, #4a00e0 50%, #8e2de2 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill-opacity='0.1'%3E%3Ccircle cx='20' cy='20' r='2' fill='%23FFD700'/%3E%3Ccircle cx='80' cy='40' r='1.5' fill='%23FFD700'/%3E%3Ccircle cx='50' cy='70' r='1' fill='%23FFD700'/%3E%3Ccircle cx='100' cy='90' r='2' fill='%23FFD700'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-purple-600 to-indigo-600",
      received: "bg-white/10",
      sentText: "text-white",
      receivedText: "text-purple-100",
    },
    bubbleStyle: {
      borderRadius: "rounded-2xl",
      shadow: "shadow-purple-500/50 shadow-2xl",
      backdrop: "backdrop-blur-lg",
    },
    inputStyle: {
      background: "bg-purple-900/30",
      border: "border-purple-400/50",
      text: "text-purple-100",
      placeholder: "placeholder:text-purple-300/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-purple-600 to-indigo-600",
      text: "text-white",
      accent: "text-purple-200",
    },
    animations: {
      messageEntry: "animate-sparkle",
      typing: "animate-pulse",
      send: "animate-ping",
    },
    emoji: "✨",
  },
  {
    id: "neon",
    name: "neon",
    displayName: "Neon Glow",
    description: "Electric neon cyberpunk vibes",
    background:
      "linear-gradient(135deg, #0f0f23 0%, #1a1a2e 50%, #16213e 100%)",
    messageColors: {
      sent: "bg-gradient-to-r from-cyan-400 to-pink-400",
      received: "bg-gray-800/60",
      sentText: "text-black",
      receivedText: "text-cyan-400",
    },
    bubbleStyle: {
      borderRadius: "rounded-xl",
      shadow: "shadow-cyan-400/50 shadow-lg",
      backdrop: "backdrop-blur-sm border border-cyan-400/30",
    },
    inputStyle: {
      background: "bg-gray-900/50",
      border: "border-cyan-400/50",
      text: "text-cyan-400",
      placeholder: "placeholder:text-cyan-400/60",
    },
    headerStyle: {
      background: "bg-gray-900/80",
      text: "text-cyan-400",
      accent: "text-pink-400",
    },
    animations: {
      messageEntry: "animate-glow",
      typing: "animate-pulse",
      send: "animate-ping",
    },
    emoji: "⚡",
  },
  {
    id: "cherry",
    name: "cherry",
    displayName: "Cherry Blossom",
    description: "Soft pink cherry blossom theme",
    background:
      "linear-gradient(135deg, #ffeef8 0%, #f8c9d4 50%, #f19cb1 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'%3E%3Cg fill-opacity='0.1'%3E%3Ccircle cx='25' cy='25' r='15' fill='%23FF69B4'/%3E%3Ccircle cx='75' cy='75' r='10' fill='%23FF1493'/%3E%3Ccircle cx='75' cy='25' r='12' fill='%23FFB6C1'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-pink-400 to-rose-400",
      received: "bg-white/40",
      sentText: "text-white",
      receivedText: "text-pink-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-full",
      shadow: "shadow-pink-300/50 shadow-lg",
      backdrop: "backdrop-blur-sm",
    },
    inputStyle: {
      background: "bg-pink-50/60",
      border: "border-pink-200/60",
      text: "text-pink-900",
      placeholder: "placeholder:text-pink-500/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-pink-400 to-rose-400",
      text: "text-white",
      accent: "text-pink-100",
    },
    animations: {
      messageEntry: "animate-float",
      typing: "animate-bounce",
      send: "animate-scale-in",
    },
    emoji: "🌸",
  },
  {
    id: "midnight",
    name: "midnight",
    displayName: "Midnight",
    description: "Dark elegant midnight theme",
    background:
      "linear-gradient(135deg, #0c0c0c 0%, #1a1a1a 50%, #2d2d2d 100%)",
    messageColors: {
      sent: "bg-gradient-to-r from-gray-600 to-gray-700",
      received: "bg-gray-800/60",
      sentText: "text-white",
      receivedText: "text-gray-200",
    },
    bubbleStyle: {
      borderRadius: "rounded-lg",
      shadow: "shadow-black/50 shadow-lg",
      backdrop: "backdrop-blur-sm border border-gray-600/30",
    },
    inputStyle: {
      background: "bg-gray-800/50",
      border: "border-gray-600/50",
      text: "text-gray-200",
      placeholder: "placeholder:text-gray-400",
    },
    headerStyle: {
      background: "bg-gray-900/80",
      text: "text-gray-200",
      accent: "text-gray-400",
    },
    animations: {
      messageEntry: "animate-fade-in-up",
      typing: "animate-pulse",
      send: "animate-slide-in-right",
    },
    emoji: "🌙",
  },
  {
    id: "tropical",
    name: "tropical",
    displayName: "Tropical Paradise",
    description: "Vibrant tropical colors",
    background:
      "linear-gradient(135deg, #ff9a56 0%, #ffad56 25%, #67b26f 50%, #4ca2cd 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Cg fill-opacity='0.1'%3E%3Cpath d='M40 20c5 0 10 5 10 10s-5 10-10 10-10-5-10-10 5-10 10-10zm0 30c5 0 10 5 10 10s-5 10-10 10-10-5-10-10 5-10 10-10z' fill='%23FF6B35'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-orange-400 to-green-400",
      received: "bg-white/25",
      sentText: "text-white",
      receivedText: "text-green-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-2xl",
      shadow: "shadow-orange-400/40 shadow-lg",
      backdrop: "backdrop-blur-md",
    },
    inputStyle: {
      background: "bg-orange-100/30",
      border: "border-orange-300/50",
      text: "text-green-900",
      placeholder: "placeholder:text-orange-600/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-orange-400 to-green-400",
      text: "text-white",
      accent: "text-orange-200",
    },
    animations: {
      messageEntry: "animate-bounce",
      typing: "animate-float",
      send: "animate-scale-in",
    },
    emoji: "🏝️",
  },
];

// Weather-based themes
const weatherThemes: Record<string, ChatTheme> = {
  sunny: {
    id: "weather-sunny",
    name: "weather-sunny",
    displayName: "Sunny Day",
    description: "Bright and cheerful sunny weather",
    background:
      "linear-gradient(135deg, #ffeaa7 0%, #fab1a0 50%, #fd79a8 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='10' fill='%23FFD700'/%3E%3Cpath d='M30 5v10M30 45v10M55 30h-10M15 30H5M47.4 12.6l-7.1 7.1M19.7 40.3l-7.1 7.1M47.4 47.4l-7.1-7.1M19.7 19.7l-7.1-7.1' stroke='%23FFD700' stroke-width='2'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-yellow-400 to-orange-400",
      received: "bg-white/30",
      sentText: "text-orange-900",
      receivedText: "text-orange-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-full",
      shadow: "shadow-yellow-400/50 shadow-xl",
      backdrop: "backdrop-blur-sm",
    },
    inputStyle: {
      background: "bg-yellow-100/40",
      border: "border-yellow-300/60",
      text: "text-orange-900",
      placeholder: "placeholder:text-orange-600/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-yellow-400 to-orange-400",
      text: "text-orange-900",
      accent: "text-yellow-600",
    },
    animations: {
      messageEntry: "animate-bounce",
      typing: "animate-pulse",
      send: "animate-ping",
    },
    emoji: "☀️",
    weatherType: "sunny",
  },
  rainy: {
    id: "weather-rainy",
    name: "weather-rainy",
    displayName: "Rainy Day",
    description: "Cozy rainy day atmosphere",
    background:
      "linear-gradient(135deg, #74b9ff 0%, #0984e3 50%, #6c5ce7 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 40 40'%3E%3Cg fill-opacity='0.1'%3E%3Cpath d='M10 5l2 10M20 8l2 10M30 6l2 10M15 15l2 10M25 18l2 10M35 16l2 10' stroke='%234FC3F7' stroke-width='1'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-blue-500 to-indigo-500",
      received: "bg-white/20",
      sentText: "text-white",
      receivedText: "text-blue-100",
    },
    bubbleStyle: {
      borderRadius: "rounded-3xl",
      shadow: "shadow-blue-500/40 shadow-lg",
      backdrop: "backdrop-blur-lg",
    },
    inputStyle: {
      background: "bg-blue-900/20",
      border: "border-blue-300/40",
      text: "text-blue-100",
      placeholder: "placeholder:text-blue-200/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-blue-500 to-indigo-500",
      text: "text-white",
      accent: "text-blue-200",
    },
    animations: {
      messageEntry: "animate-slide-in-right",
      typing: "animate-bounce",
      send: "animate-float",
    },
    emoji: "🌧️",
    weatherType: "rainy",
  },
  cloudy: {
    id: "weather-cloudy",
    name: "weather-cloudy",
    displayName: "Cloudy Day",
    description: "Soft cloudy day vibes",
    background:
      "linear-gradient(135deg, #ddd6fe 0%, #c7d2fe 50%, #a5b4fc 100%)",
    messageColors: {
      sent: "bg-gradient-to-r from-gray-400 to-slate-500",
      received: "bg-white/30",
      sentText: "text-white",
      receivedText: "text-gray-700",
    },
    bubbleStyle: {
      borderRadius: "rounded-2xl",
      shadow: "shadow-gray-400/30 shadow-lg",
      backdrop: "backdrop-blur-md",
    },
    inputStyle: {
      background: "bg-gray-100/40",
      border: "border-gray-300/50",
      text: "text-gray-700",
      placeholder: "placeholder:text-gray-500/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-gray-400 to-slate-500",
      text: "text-white",
      accent: "text-gray-200",
    },
    animations: {
      messageEntry: "animate-fade-in-up",
      typing: "animate-pulse",
      send: "animate-slide-in-left",
    },
    emoji: "☁️",
    weatherType: "cloudy",
  },
  snowy: {
    id: "weather-snowy",
    name: "weather-snowy",
    displayName: "Snowy Day",
    description: "Beautiful winter snow theme",
    background:
      "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 50%, #90caf9 100%)",
    pattern: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='60' height='60' viewBox='0 0 60 60'%3E%3Cg fill-opacity='0.1'%3E%3Ccircle cx='15' cy='15' r='3' fill='%23ffffff'/%3E%3Ccircle cx='45' cy='25' r='2' fill='%23ffffff'/%3E%3Ccircle cx='25' cy='45' r='2.5' fill='%23ffffff'/%3E%3Ccircle cx='50' cy='50' r='3' fill='%23ffffff'/%3E%3C/g%3E%3C/svg%3E")`,
    messageColors: {
      sent: "bg-gradient-to-r from-blue-300 to-cyan-300",
      received: "bg-white/40",
      sentText: "text-blue-900",
      receivedText: "text-blue-900",
    },
    bubbleStyle: {
      borderRadius: "rounded-full",
      shadow: "shadow-blue-200/50 shadow-lg",
      backdrop: "backdrop-blur-sm border border-white/30",
    },
    inputStyle: {
      background: "bg-white/50",
      border: "border-blue-200/60",
      text: "text-blue-900",
      placeholder: "placeholder:text-blue-600/70",
    },
    headerStyle: {
      background: "bg-gradient-to-r from-blue-300 to-cyan-300",
      text: "text-blue-900",
      accent: "text-blue-600",
    },
    animations: {
      messageEntry: "animate-float",
      typing: "animate-bounce",
      send: "animate-sparkle",
    },
    emoji: "❄️",
    weatherType: "snowy",
  },
};

interface ThemeContextType {
  currentTheme: ChatTheme;
  availableThemes: ChatTheme[];
  weatherThemes: Record<string, ChatTheme>;
  isWeatherEnabled: boolean;
  currentWeather: string | null;
  userLocation: { lat: number; lon: number } | null;
  setTheme: (themeId: string) => void;
  toggleWeatherThemes: () => void;
  updateWeatherTheme: (weather: string) => void;
  getUserLocation: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState<ChatTheme>(chatThemes[0]);
  const [isWeatherEnabled, setIsWeatherEnabled] = useState(false);
  const [currentWeather, setCurrentWeather] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem("chat_theme");
    const savedWeatherEnabled = localStorage.getItem("weather_themes_enabled");
    const savedLocation = localStorage.getItem("user_location");

    if (savedTheme) {
      const theme = [...chatThemes, ...Object.values(weatherThemes)].find(
        (t) => t.id === savedTheme,
      );
      if (theme) {
        setCurrentTheme(theme);
      }
    }

    if (savedWeatherEnabled === "true") {
      setIsWeatherEnabled(true);
    }

    if (savedLocation) {
      try {
        setUserLocation(JSON.parse(savedLocation));
      } catch (error) {
        console.error("Failed to parse saved location:", error);
      }
    }
  }, []);

  // Auto-fetch weather when weather themes are enabled and location is available
  useEffect(() => {
    if (isWeatherEnabled && userLocation && !currentWeather) {
      fetchCurrentWeather();
    }
  }, [isWeatherEnabled, userLocation]);

  // Update theme when weather changes and weather themes are enabled
  useEffect(() => {
    if (isWeatherEnabled && currentWeather && weatherThemes[currentWeather]) {
      setCurrentTheme(weatherThemes[currentWeather]);
    }
  }, [isWeatherEnabled, currentWeather]);

  const setTheme = (themeId: string) => {
    const theme = [...chatThemes, ...Object.values(weatherThemes)].find(
      (t) => t.id === themeId,
    );
    if (theme) {
      setCurrentTheme(theme);
      localStorage.setItem("chat_theme", themeId);

      // If setting a manual theme, temporarily disable weather themes
      if (!theme.weatherType) {
        setIsWeatherEnabled(false);
        localStorage.setItem("weather_themes_enabled", "false");
      }
    }
  };

  const toggleWeatherThemes = async () => {
    if (!isWeatherEnabled) {
      // Enable weather themes
      if (!userLocation) {
        await getUserLocation();
      }
      if (userLocation) {
        setIsWeatherEnabled(true);
        localStorage.setItem("weather_themes_enabled", "true");
        await fetchCurrentWeather();
      }
    } else {
      // Disable weather themes
      setIsWeatherEnabled(false);
      localStorage.setItem("weather_themes_enabled", "false");
      // Revert to default theme
      setCurrentTheme(chatThemes[0]);
      localStorage.setItem("chat_theme", chatThemes[0].id);
    }
  };

  const getUserLocation = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        setError("Geolocation is not supported by this browser");
        reject(new Error("Geolocation not supported"));
        return;
      }

      setIsLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          };
          setUserLocation(location);
          localStorage.setItem("user_location", JSON.stringify(location));
          setIsLoading(false);
          resolve();
        },
        (error) => {
          setError("Unable to retrieve your location");
          setIsLoading(false);
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        },
      );
    });
  };

  const fetchCurrentWeather = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      // Using OpenWeatherMap API (you would need to add your API key)
      // For demo purposes, we'll simulate weather data
      const weatherConditions = ["sunny", "rainy", "cloudy", "snowy"];
      const randomWeather =
        weatherConditions[Math.floor(Math.random() * weatherConditions.length)];

      // In a real app, you would make an API call like this:
      // const API_KEY = 'your-openweathermap-api-key';
      // const response = await fetch(
      //   `https://api.openweathermap.org/data/2.5/weather?lat=${userLocation.lat}&lon=${userLocation.lon}&appid=${API_KEY}`
      // );
      // const data = await response.json();
      // const weather = mapWeatherCodeToTheme(data.weather[0].main.toLowerCase());

      setCurrentWeather(randomWeather);
      updateWeatherTheme(randomWeather);
    } catch (error) {
      console.error("Failed to fetch weather:", error);
      setError("Failed to fetch weather data");
    } finally {
      setIsLoading(false);
    }
  };

  const updateWeatherTheme = (weather: string) => {
    if (weatherThemes[weather]) {
      setCurrentWeather(weather);
      if (isWeatherEnabled) {
        setCurrentTheme(weatherThemes[weather]);
        localStorage.setItem("chat_theme", weatherThemes[weather].id);
      }
    }
  };

  const value: ThemeContextType = {
    currentTheme,
    availableThemes: chatThemes,
    weatherThemes,
    isWeatherEnabled,
    currentWeather,
    userLocation,
    setTheme,
    toggleWeatherThemes,
    updateWeatherTheme,
    getUserLocation,
    isLoading,
    error,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export { chatThemes, weatherThemes };
