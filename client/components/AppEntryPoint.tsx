import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import AppLoader from "./AppLoader";
import EnhancedAuth from "../pages/EnhancedAuth";
import Index from "../pages/Index";
import { useAuth } from "../contexts/AuthContext";

export default function AppEntryPoint() {
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [isAppReady, setIsAppReady] = useState(false);
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  useEffect(() => {
    // Minimum loading time for smooth experience
    const minLoadingTime = 3000;
    const startTime = Date.now();

    const checkAuthAndComplete = () => {
      const elapsedTime = Date.now() - startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

      setTimeout(() => {
        setIsLoading(false);
        if (!authLoading) {
          if (isAuthenticated) {
            // User is authenticated, show main app
            setTimeout(() => setIsAppReady(true), 500);
          } else {
            // User not authenticated, show auth
            setTimeout(() => setShowAuth(true), 500);
          }
        }
      }, remainingTime);
    };

    // Wait for auth check to complete
    if (!authLoading) {
      checkAuthAndComplete();
    }
  }, [isAuthenticated, authLoading]);

  // Handle auth completion
  useEffect(() => {
    if (isAuthenticated && showAuth) {
      setShowAuth(false);
      setTimeout(() => setIsAppReady(true), 800);
    }
  }, [isAuthenticated, showAuth]);

  return (
    <div className="relative w-full min-h-screen">
      <AnimatePresence mode="wait">
        {/* Loading Screen */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 1 }}
            exit={{
              opacity: 0,
              scale: 1.1,
              filter: "blur(10px)",
            }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0 z-50"
          >
            <AppLoader onComplete={() => setIsLoading(false)} />
          </motion.div>
        )}

        {/* Authentication Screen */}
        {!isLoading && showAuth && !isAppReady && (
          <motion.div
            key="auth"
            initial={{
              opacity: 0,
              scale: 0.9,
              y: 50,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 1.1,
              y: -50,
              filter: "blur(5px)",
            }}
            transition={{
              duration: 0.8,
              ease: "easeOut",
              type: "spring",
              stiffness: 100,
              damping: 20,
            }}
            className="fixed inset-0 z-40 overflow-y-auto"
          >
            <EnhancedAuth />
          </motion.div>
        )}

        {/* Main Application */}
        {!isLoading && !showAuth && isAppReady && (
          <motion.div
            key="app"
            initial={{
              opacity: 0,
              scale: 0.95,
              y: 30,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            transition={{
              duration: 1,
              ease: "easeOut",
              type: "spring",
              stiffness: 80,
              damping: 20,
            }}
            className="absolute inset-0 z-30"
          >
            {/* Page transition overlay */}
            <motion.div
              initial={{ opacity: 1 }}
              animate={{ opacity: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              className="absolute inset-0 bg-gradient-to-br from-purple-900/80 via-blue-900/60 to-transparent z-10 pointer-events-none"
            />

            {/* Sparkle effect on entry */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ delay: 0.2, duration: 1.5 }}
              className="absolute inset-0 pointer-events-none z-20"
            >
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 bg-white rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    scale: [0, 1, 0],
                    opacity: [0, 1, 0],
                    rotate: [0, 180, 360],
                  }}
                  transition={{
                    duration: 2,
                    delay: Math.random() * 1,
                    ease: "easeOut",
                  }}
                />
              ))}
            </motion.div>

            <Index />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading state fallback */}
      {authLoading && !isLoading && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 z-60"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="text-center space-y-4"
            animate={{
              y: [0, -10, 0],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
            <p className="text-white/80">Checking authentication...</p>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}
