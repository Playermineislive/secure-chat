import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Check,
  X,
  Heart,
  MessageCircle,
  Clock,
  User,
  Sparkles,
  Star,
  Mail,
  Calendar,
} from "lucide-react";
import { InviteRequest } from "@shared/api";

interface InviteRequestCardProps {
  request: InviteRequest;
  onAccept: (requestId: string) => Promise<boolean>;
  onReject: (requestId: string) => Promise<boolean>;
  onView: (request: InviteRequest) => void;
  index: number;
}

export default function InviteRequestCard({
  request,
  onAccept,
  onReject,
  onView,
  index,
}: InviteRequestCardProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [action, setAction] = useState<"accept" | "reject" | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(false);

  // Calculate time left until expiry
  useEffect(() => {
    const updateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(request.expiresAt).getTime();
      const diff = Math.max(0, expiry - now);
      setTimeLeft(Math.floor(diff / 1000));
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [request.expiresAt]);

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return "Expired";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const handleAccept = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setAction("accept");

    try {
      await onAccept(request.id);
    } catch (error) {
      console.error("Failed to accept invite:", error);
      setAction(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    setAction("reject");

    try {
      await onReject(request.id);
    } catch (error) {
      console.error("Failed to reject invite:", error);
      setAction(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const getInitials = (email: string, username?: string) => {
    if (username) return username.charAt(0).toUpperCase();
    return email.charAt(0).toUpperCase();
  };

  const getTimeSinceReceived = (timestamp: string) => {
    const now = new Date().getTime();
    const received = new Date(timestamp).getTime();
    const diff = now - received;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{
        delay: index * 0.1,
        duration: 0.4,
        type: "spring",
        bounce: 0.3,
      }}
      whileHover={{ y: -2, scale: 1.02 }}
      className="relative"
    >
      {/* Background glow effect */}
      <motion.div
        className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-[1.5rem] blur-lg"
        animate={{
          opacity: [0.5, 0.8, 0.5],
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      <Card
        className={`relative bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 overflow-hidden ${
          timeLeft <= 0 ? "opacity-60" : ""
        }`}
      >
        {/* Animated border */}
        <motion.div
          className="absolute inset-0 rounded-[1.5rem]"
          style={{
            background:
              "linear-gradient(45deg, transparent, rgba(255,255,255,0.1), transparent)",
          }}
          animate={{
            rotate: [0, 360],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        <CardContent className="p-6 relative z-10">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <Avatar className="w-14 h-14 border-2 border-white/20">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.senderEmail}`}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold text-lg">
                      {getInitials(request.senderEmail, request.senderUsername)}
                    </AvatarFallback>
                  </Avatar>
                </motion.div>

                <div className="flex-1">
                  <motion.h3
                    className="text-white font-semibold text-lg"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    {request.senderUsername ||
                      request.senderEmail.split("@")[0]}
                  </motion.h3>
                  <motion.p
                    className="text-white/70 text-sm flex items-center space-x-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Mail className="w-3 h-3" />
                    <span>{request.senderEmail}</span>
                  </motion.p>
                  <motion.p
                    className="text-white/50 text-xs flex items-center space-x-1 mt-1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>
                      Received {getTimeSinceReceived(request.timestamp)}
                    </span>
                  </motion.p>
                </div>
              </div>

              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
              >
                <Badge
                  variant="outline"
                  className="bg-blue-500/20 border-blue-400/50 text-blue-300 flex items-center space-x-1"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>New Request</span>
                </Badge>
              </motion.div>
            </div>

            {/* Message */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <p className="text-white/80 text-sm flex items-center space-x-2">
                <MessageCircle className="w-4 h-4 text-blue-400" />
                <span>wants to connect and start chatting with you!</span>
              </p>
            </motion.div>

            {/* Time remaining */}
            {timeLeft > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center space-x-2 text-white/60">
                  <Clock className="w-4 h-4" />
                  <span>Expires in {formatTimeLeft(timeLeft)}</span>
                </div>

                <motion.button
                  onClick={() => setShowDetails(!showDetails)}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showDetails ? "Show less" : "View details"}
                </motion.button>
              </motion.div>
            )}

            {/* Detailed info */}
            <AnimatePresence>
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Request ID:</span>
                    <span className="font-mono">{request.id.slice(-8)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Invite Code:</span>
                    <span className="font-mono">{request.code}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Status:</span>
                    <Badge
                      variant="outline"
                      className="bg-yellow-500/20 border-yellow-400/50 text-yellow-300"
                    >
                      {request.status}
                    </Badge>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="flex space-x-3 pt-2"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1"
              >
                <Button
                  onClick={handleAccept}
                  disabled={isProcessing || timeLeft <= 0}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0 h-12 rounded-xl font-medium relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {isProcessing && action === "accept" ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <Sparkles className="w-5 h-5" />
                        </motion.div>
                        <span>Accepting...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="accept"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <Heart className="w-5 h-5" />
                        <span>Accept</span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success animation */}
                  {action === "accept" && !isProcessing && (
                    <motion.div
                      className="absolute inset-0 bg-green-400"
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </Button>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1"
              >
                <Button
                  onClick={handleReject}
                  disabled={isProcessing || timeLeft <= 0}
                  variant="outline"
                  className="w-full bg-white/5 hover:bg-red-500/20 border-white/20 hover:border-red-400/50 text-white hover:text-red-300 h-12 rounded-xl font-medium relative overflow-hidden"
                >
                  <AnimatePresence mode="wait">
                    {isProcessing && action === "reject" ? (
                      <motion.div
                        key="loading"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <motion.div
                          animate={{ rotate: -360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                        >
                          <X className="w-5 h-5" />
                        </motion.div>
                        <span>Declining...</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="reject"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0 }}
                        className="flex items-center space-x-2"
                      >
                        <X className="w-5 h-5" />
                        <span>Decline</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </motion.div>
            </motion.div>

            {/* Expired message */}
            {timeLeft <= 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-2"
              >
                <Badge
                  variant="outline"
                  className="bg-red-500/20 border-red-400/50 text-red-300"
                >
                  This invite request has expired
                </Badge>
              </motion.div>
            )}
          </div>
        </CardContent>

        {/* Progress bar for expiry */}
        {timeLeft > 0 && (
          <motion.div
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-blue-500 to-purple-500"
            initial={{ width: "100%" }}
            animate={{
              width: `${Math.max(0, (timeLeft / (24 * 60 * 60)) * 100)}%`,
            }}
            transition={{ duration: 1 }}
          />
        )}
      </Card>
    </motion.div>
  );
}
