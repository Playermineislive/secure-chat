import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../contexts/ThemeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Palette,
  Heart,
  CloudSun,
  Sparkles,
  Sun,
  CloudRain,
  Snowflake,
  Cloud,
  Zap,
  Star,
  RefreshCw,
} from "lucide-react";

interface ThemeShowcaseProps {
  onClose: () => void;
}

export default function ThemeShowcase({ onClose }: ThemeShowcaseProps) {
  const {
    currentTheme,
    availableThemes,
    weatherThemes,
    isWeatherEnabled,
    currentWeather,
    setTheme,
    toggleWeatherThemes,
  } = useTheme();

  const [demoMessage, setDemoMessage] = useState(
    "Hey! This is how your messages will look 💫",
  );

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

  const popularThemes = availableThemes.slice(0, 4);
  const weatherThemesList = Object.values(weatherThemes);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-white/10 backdrop-blur-xl rounded-[2rem] border border-white/20 w-full max-w-6xl max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Palette className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Theme Showcase
                  </h2>
                  <p className="text-white/60">
                    Explore beautiful chat themes and weather integration
                  </p>
                </div>
              </div>

              <motion.button
                onClick={onClose}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white/70 hover:text-white transition-all duration-200"
                whileHover={{ scale: 1.1, rotate: 90 }}
                whileTap={{ scale: 0.9 }}
              >
                ✕
              </motion.button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* Current Theme Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-white/5 border-white/10 overflow-hidden">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    <span>Current Theme: {currentTheme.displayName}</span>
                    <span className="text-2xl">{currentTheme.emoji}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className="w-full h-40 rounded-xl relative overflow-hidden mb-4"
                    style={{ background: currentTheme.background }}
                  >
                    {currentTheme.pattern && (
                      <div
                        className="absolute inset-0 opacity-30"
                        style={{ backgroundImage: currentTheme.pattern }}
                      />
                    )}

                    {/* Demo messages */}
                    <div className="absolute inset-0 flex flex-col justify-center space-y-3 p-6">
                      <motion.div
                        className={`${currentTheme.messageColors.sent} ${currentTheme.messageColors.sentText} px-4 py-2 ${currentTheme.bubbleStyle.borderRadius} ${currentTheme.bubbleStyle.shadow} self-end max-w-xs`}
                        animate={{ x: [10, 0] }}
                        transition={{ delay: 0.5 }}
                      >
                        {demoMessage}
                      </motion.div>
                      <motion.div
                        className={`${currentTheme.messageColors.received} ${currentTheme.messageColors.receivedText} px-4 py-2 ${currentTheme.bubbleStyle.borderRadius} ${currentTheme.bubbleStyle.shadow} self-start max-w-xs`}
                        animate={{ x: [-10, 0] }}
                        transition={{ delay: 0.7 }}
                      >
                        That looks amazing! 🎨
                      </motion.div>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm">
                    {currentTheme.description}
                  </p>
                </CardContent>
              </Card>
            </motion.div>

            {/* Weather Integration */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <CloudSun className="w-5 h-5 text-blue-400" />
                    <span>Weather-Based Themes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80">
                        Automatically adapt themes to your local weather
                      </p>
                      {isWeatherEnabled && currentWeather && (
                        <div className="flex items-center space-x-2 mt-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-500/20 border-blue-400/50 text-blue-300"
                          >
                            {getWeatherIcon(currentWeather)}
                            <span className="ml-1 capitalize">
                              {currentWeather} Theme Active
                            </span>
                          </Badge>
                        </div>
                      )}
                    </div>
                    <Switch
                      checked={isWeatherEnabled}
                      onCheckedChange={toggleWeatherThemes}
                    />
                  </div>

                  {/* Weather Themes Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {weatherThemesList.map((theme) => (
                      <motion.div
                        key={theme.id}
                        className="relative group cursor-pointer"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setTheme(theme.id)}
                      >
                        <div
                          className="w-full h-20 rounded-lg relative overflow-hidden"
                          style={{ background: theme.background }}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl">{theme.emoji}</span>
                          </div>
                          {currentTheme.id === theme.id && (
                            <motion.div
                              className="absolute inset-0 border-2 border-green-400 rounded-lg"
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                            />
                          )}
                        </div>
                        <p className="text-white/80 text-xs text-center mt-1">
                          {theme.displayName}
                        </p>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Popular Themes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Heart className="w-5 h-5 text-pink-400" />
                    <span>Popular Themes</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {popularThemes.map((theme, index) => (
                      <motion.div
                        key={theme.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 + index * 0.1 }}
                        className="relative group cursor-pointer"
                        onClick={() => setTheme(theme.id)}
                      >
                        <Card
                          className={`bg-white/5 border-white/10 hover:bg-white/10 transition-all duration-200 overflow-hidden ${
                            currentTheme.id === theme.id
                              ? "ring-2 ring-blue-400/50"
                              : ""
                          }`}
                        >
                          <CardContent className="p-4">
                            <div
                              className="w-full h-16 rounded-lg mb-3 relative overflow-hidden"
                              style={{ background: theme.background }}
                            >
                              {theme.pattern && (
                                <div
                                  className="absolute inset-0 opacity-20"
                                  style={{ backgroundImage: theme.pattern }}
                                />
                              )}
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-xl">{theme.emoji}</span>
                              </div>
                            </div>
                            <h3 className="text-white font-medium text-sm mb-1">
                              {theme.displayName}
                            </h3>
                            <p className="text-white/60 text-xs">
                              {theme.description}
                            </p>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Theme Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Sparkles className="w-5 h-5 text-purple-400" />
                    <span>Theme Features</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Palette className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="text-white font-medium">
                        10+ Beautiful Themes
                      </h4>
                      <p className="text-white/60 text-sm">
                        Love, Ocean, Galaxy, and more
                      </p>
                    </div>

                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto">
                        <CloudSun className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="text-white font-medium">
                        Weather Integration
                      </h4>
                      <p className="text-white/60 text-sm">
                        Themes adapt to your weather
                      </p>
                    </div>

                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                        <Zap className="w-6 h-6 text-green-400" />
                      </div>
                      <h4 className="text-white font-medium">
                        Real-time Switching
                      </h4>
                      <p className="text-white/60 text-sm">
                        Instant theme changes
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <p className="text-white/60 text-sm">
                Enjoy your personalized chat experience! 🎨
              </p>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
              >
                Start Chatting
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
