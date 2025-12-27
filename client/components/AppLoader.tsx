import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface AppLoaderProps {
  onComplete: () => void;
}

export default function AppLoader({ onComplete }: AppLoaderProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [showLogo, setShowLogo] = useState(false);

  const loadingPhases = [
    "Initializing SecureChat...",
    "Loading encryption modules...",
    "Connecting to secure servers...",
    "Preparing your experience...",
    "Welcome to SecureChat!",
  ];

  useEffect(() => {
    // Show logo after initial delay
    const logoTimer = setTimeout(() => setShowLogo(true), 300);

    // Simulate loading progress
    const progressTimer = setInterval(() => {
      setLoadingProgress((prev) => {
        const newProgress = prev + Math.random() * 15 + 5;

        // Update phase based on progress
        const phase = Math.floor((newProgress / 100) * loadingPhases.length);
        setCurrentPhase(Math.min(phase, loadingPhases.length - 1));

        if (newProgress >= 100) {
          clearInterval(progressTimer);
          // Complete after a short delay to show 100%
          setTimeout(() => onComplete(), 800);
          return 100;
        }

        return newProgress;
      });
    }, 200);

    return () => {
      clearTimeout(logoTimer);
      clearInterval(progressTimer);
    };
  }, [onComplete, loadingPhases.length]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Animated background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 bg-white/20 rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0, 1, 0],
                scale: [0, 1, 0],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>

        {/* Radial gradient overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-radial from-purple-600/30 via-transparent to-transparent"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Main content */}
        <div className="relative z-10 text-center max-w-md mx-auto px-6">
          {/* Logo animation */}
          <AnimatePresence>
            {showLogo && (
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 20,
                  duration: 1,
                }}
                className="mb-8"
              >
                <motion.div
                  className="relative w-24 h-24 mx-auto mb-4"
                  animate={{
                    rotate: [0, 360],
                  }}
                  transition={{
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                >
                  {/* Outer ring */}
                  <motion.div
                    className="absolute inset-0 rounded-full border-4 border-gradient-to-r from-purple-400 to-pink-400"
                    style={{
                      background:
                        "conic-gradient(from 0deg, #8B5CF6, #EC4899, #3B82F6, #8B5CF6)",
                      borderRadius: "50%",
                    }}
                    animate={{
                      rotate: [0, -360],
                    }}
                    transition={{
                      duration: 15,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                  />

                  {/* Inner logo */}
                  <motion.div
                    className="absolute inset-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center shadow-2xl"
                    animate={{
                      boxShadow: [
                        "0 0 20px rgba(139, 92, 246, 0.5)",
                        "0 0 40px rgba(139, 92, 246, 0.8)",
                        "0 0 20px rgba(139, 92, 246, 0.5)",
                      ],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      className="text-white text-2xl font-bold"
                      animate={{
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    >
                      🔒
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* App name */}
                <motion.h1
                  className="text-4xl font-bold text-white mb-2"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.8 }}
                >
                  SecureChat
                </motion.h1>

                <motion.p
                  className="text-purple-200 text-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7, duration: 0.8 }}
                >
                  End-to-End Encrypted Messaging
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading progress */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="space-y-6"
          >
            {/* Progress bar */}
            <div className="relative">
              <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>

              {/* Progress glow */}
              <motion.div
                className="absolute inset-0 h-2 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 rounded-full blur-sm opacity-50"
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>

            {/* Progress text */}
            <div className="text-center space-y-2">
              <motion.p
                className="text-white font-medium text-lg"
                key={currentPhase}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.5 }}
              >
                {loadingPhases[currentPhase]}
              </motion.p>

              <motion.p
                className="text-purple-200 text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                {Math.round(loadingProgress)}% Complete
              </motion.p>
            </div>

            {/* Loading dots */}
            <div className="flex justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-purple-400 rounded-full"
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut",
                  }}
                />
              ))}
            </div>
          </motion.div>

          {/* Feature highlights */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.8, duration: 0.8 }}
            className="mt-12 grid grid-cols-3 gap-4 text-center"
          >
            {[
              { icon: "🔐", text: "Encrypted" },
              { icon: "🎨", text: "Themed" },
              { icon: "🌟", text: "Modern" },
            ].map((feature, index) => (
              <motion.div
                key={index}
                className="space-y-2"
                animate={{
                  y: [0, -5, 0],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  delay: index * 0.3,
                  ease: "easeInOut",
                }}
              >
                <div className="text-2xl">{feature.icon}</div>
                <p className="text-purple-200 text-xs font-medium">
                  {feature.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

        {/* Corner decorations */}
        <motion.div
          className="absolute top-10 left-10 w-20 h-20 border-2 border-purple-400/30 rounded-full"
          animate={{
            rotate: [0, 360],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <motion.div
          className="absolute bottom-10 right-10 w-16 h-16 border-2 border-pink-400/30 rounded-full"
          animate={{
            rotate: [360, 0],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Floating geometric shapes */}
        <motion.div
          className="absolute top-1/4 right-1/4 w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 transform rotate-45"
          animate={{
            y: [0, -20, 0],
            rotate: [45, 135, 45],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="absolute bottom-1/3 left-1/4 w-6 h-6 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full"
          animate={{
            x: [0, 15, 0],
            scale: [1, 1.3, 1],
            opacity: [0.4, 0.9, 0.4],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}
