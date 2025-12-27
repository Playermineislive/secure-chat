import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Palette,
  CloudSun,
  MapPin,
  Loader2,
  Check,
  Heart,
  Sparkles,
  Sun,
  Cloud,
  CloudRain,
  Snowflake,
  X,
  RefreshCw,
} from "lucide-react";

interface ThemeSelectorProps {
  onClose: () => void;
  isOpen: boolean;
}

export default function ThemeSelector({ onClose, isOpen }: ThemeSelectorProps) {
  const {
    currentTheme,
    availableThemes,
    weatherThemes,
    isWeatherEnabled,
    currentWeather,
    userLocation,
    setTheme,
    toggleWeatherThemes,
    getUserLocation,
    isLoading,
    error,
  } = useTheme();

  const [selectedCategory, setSelectedCategory] = useState<
    "all" | "favorites" | "weather"
  >("all");
  const [isLocationLoading, setIsLocationLoading] = useState(false);

  const getThemePreview = (theme: any) => (
    <div
      className="w-full h-20 rounded-lg relative overflow-hidden"
      style={{ background: theme.background }}
    >
      {theme.pattern && (
        <div
          className="absolute inset-0 opacity-20"
          style={{ backgroundImage: theme.pattern }}
        />
      )}
      <div className="absolute inset-0 flex items-center justify-center space-x-2 p-2">
        <div
          className={`px-3 py-1 rounded-full text-xs ${theme.messageColors.sent} ${theme.messageColors.sentText}`}
        >
          Hey! 👋
        </div>
        <div
          className={`px-3 py-1 rounded-full text-xs ${theme.messageColors.received} ${theme.messageColors.receivedText}`}
        >
          Hi there!
        </div>
      </div>
    </div>
  );

  const handleLocationRequest = async () => {
    setIsLocationLoading(true);
    try {
      await getUserLocation();
    } catch (error) {
      console.error("Failed to get location:", error);
    } finally {
      setIsLocationLoading(false);
    }
  };

  const getWeatherIcon = (weather: string) => {
    switch (weather) {
      case "sunny":
        return <Sun className="w-4 h-4" />;
      case "rainy":
        return <CloudRain className="w-4 h-4" />;
      case "cloudy":
        return <Cloud className="w-4 h-4" />;
      case "snowy":
        return <Snowflake className="w-4 h-4" />;
      default:
        return <CloudSun className="w-4 h-4" />;
    }
  };

  const filteredThemes =
    selectedCategory === "weather"
      ? Object.values(weatherThemes)
      : selectedCategory === "favorites"
        ? availableThemes.filter((theme) =>
            ["love", "galaxy", "ocean"].includes(theme.name),
          )
        : availableThemes;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.3 }}
          className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col h-full">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Palette className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Chat Themes</h2>
                  <p className="text-white/60 text-sm">
                    Customize your chat experience
                  </p>
                </div>
              </div>

              <motion.button
                onClick={onClose}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <X className="w-5 h-5" />
              </motion.button>
            </div>

            {/* Weather Theme Toggle */}
            <div className="p-6 border-b border-white/10">
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-3">
                  <CardTitle className="text-white flex items-center space-x-2 text-lg">
                    <CloudSun className="w-5 h-5" />
                    <span>Weather-Based Themes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">
                        Automatically change themes based on your local weather
                      </p>
                      {currentWeather && isWeatherEnabled && (
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge
                            variant="outline"
                            className="bg-white/10 border-white/20 text-white"
                          >
                            {getWeatherIcon(currentWeather)}
                            <span className="ml-1 capitalize">
                              {currentWeather}
                            </span>
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={isWeatherEnabled}
                      onCheckedChange={toggleWeatherThemes}
                      disabled={isLoading}
                    />
                  </div>

                  {!userLocation && !isWeatherEnabled && (
                    <Alert className="bg-blue-500/20 border-blue-400/50">
                      <MapPin className="w-4 h-4" />
                      <AlertDescription className="text-blue-200">
                        <div className="flex items-center justify-between">
                          <span>Location access needed for weather themes</span>
                          <Button
                            onClick={handleLocationRequest}
                            disabled={isLocationLoading}
                            variant="outline"
                            size="sm"
                            className="ml-2 bg-blue-600/20 border-blue-400/50 text-blue-200 hover:bg-blue-600/30"
                          >
                            {isLocationLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <MapPin className="w-3 h-3" />
                            )}
                            <span className="ml-1">Allow Location</span>
                          </Button>
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {error && (
                    <Alert className="bg-red-500/20 border-red-400/50">
                      <AlertDescription className="text-red-200">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Category Tabs */}
            <div className="px-6 py-4">
              <div className="flex space-x-2">
                {[
                  { id: "all", label: "All Themes", icon: Palette },
                  { id: "favorites", label: "Popular", icon: Heart },
                  { id: "weather", label: "Weather", icon: CloudSun },
                ].map((category) => (
                  <motion.button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id as any)}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
                      selectedCategory === category.id
                        ? "bg-white/20 text-white"
                        : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <category.icon className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {category.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Themes Grid */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredThemes.map((theme, index) => (
                  <motion.div
                    key={theme.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Card
                      className={`bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200 cursor-pointer relative overflow-hidden ${
                        currentTheme.id === theme.id
                          ? "ring-2 ring-blue-400/50"
                          : ""
                      }`}
                      onClick={() => setTheme(theme.id)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          {/* Theme Preview */}
                          <div className="relative">
                            {getThemePreview(theme)}
                            {currentTheme.id === theme.id && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
                              >
                                <Check className="w-3 h-3 text-white" />
                              </motion.div>
                            )}
                          </div>

                          {/* Theme Info */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="text-white font-medium text-sm flex items-center space-x-2">
                                <span>{theme.displayName}</span>
                                <span className="text-lg">{theme.emoji}</span>
                              </h3>
                              {theme.weatherType && (
                                <Badge
                                  variant="outline"
                                  className="bg-white/10 border-white/20 text-white text-xs"
                                >
                                  {getWeatherIcon(theme.weatherType)}
                                </Badge>
                              )}
                            </div>
                            <p className="text-white/60 text-xs">
                              {theme.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filteredThemes.length === 0 && (
                <div className="text-center py-12">
                  <Sparkles className="w-16 h-16 text-white/30 mx-auto mb-4" />
                  <h3 className="text-white text-lg font-medium mb-2">
                    No themes found
                  </h3>
                  <p className="text-white/60 text-sm">
                    Try selecting a different category
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="text-white/60 text-sm">
                  Currently using:{" "}
                  <span className="text-white font-medium">
                    {currentTheme.displayName}
                  </span>
                </div>
                <Button
                  onClick={onClose}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
