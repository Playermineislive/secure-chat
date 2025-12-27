import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  MapPin,
  Wifi,
  Shield,
  Info,
  ThumbsUp,
  ThumbsDown,
  UserCheck,
  UserX,
  Gift,
  Smile,
  Coffee,
  Music,
  Camera,
  Phone,
  Video,
} from "lucide-react";
import { InviteRequest } from "@shared/api";

interface EnhancedInviteSystemProps {
  requests: InviteRequest[];
  onAccept: (requestId: string, response?: string) => Promise<boolean>;
  onReject: (requestId: string, reason?: string) => Promise<boolean>;
  onBlock: (requestId: string) => Promise<boolean>;
  onViewProfile: (request: InviteRequest) => void;
}

export default function EnhancedInviteSystem({
  requests,
  onAccept,
  onReject,
  onBlock,
  onViewProfile,
}: EnhancedInviteSystemProps) {
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(
    new Set(),
  );
  const [showDetails, setShowDetails] = useState<Set<string>>(new Set());
  const [selectedResponses, setSelectedResponses] = useState<{
    [key: string]: string;
  }>({});
  const [quickResponses] = useState([
    "Hi! Looking forward to chatting with you! 👋",
    "Thanks for the invite! Let's connect! 😊",
    "Hello! Excited to start our conversation! ✨",
    "Hey there! Nice to meet you! 🎉",
  ]);

  const [rejectionReasons] = useState([
    "Not interested right now",
    "Don't know this person",
    "Too many contacts already",
    "Prefer not to connect",
  ]);

  const handleAcceptWithResponse = async (requestId: string) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId));
    try {
      const response = selectedResponses[requestId] || "";
      await onAccept(requestId, response);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const handleRejectWithReason = async (requestId: string, reason: string) => {
    setProcessingRequests((prev) => new Set(prev).add(requestId));
    try {
      await onReject(requestId, reason);
    } finally {
      setProcessingRequests((prev) => {
        const newSet = new Set(prev);
        newSet.delete(requestId);
        return newSet;
      });
    }
  };

  const toggleDetails = (requestId: string) => {
    setShowDetails((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(requestId)) {
        newSet.delete(requestId);
      } else {
        newSet.add(requestId);
      }
      return newSet;
    });
  };

  const setQuickResponse = (requestId: string, response: string) => {
    setSelectedResponses((prev) => ({
      ...prev,
      [requestId]: response,
    }));
  };

  const getTimeLeft = (expiresAt: string) => {
    const now = new Date().getTime();
    const expiry = new Date(expiresAt).getTime();
    const diff = Math.max(0, expiry - now);
    return Math.floor(diff / 1000);
  };

  const formatTimeLeft = (seconds: number): string => {
    if (seconds <= 0) return "Expired";

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
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

  if (requests.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <MessageCircle className="w-16 h-16 text-white/30 mx-auto mb-4" />
        </motion.div>
        <h3 className="text-white text-lg font-medium mb-2">
          No pending invites
        </h3>
        <p className="text-white/60 text-sm">
          Invite requests will appear here when someone wants to connect with
          you
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h2 className="text-2xl font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-7 h-7 text-yellow-400" />
          <span>Invite Requests</span>
        </h2>
        <Badge
          variant="outline"
          className="bg-blue-500/20 border-blue-400/50 text-blue-300 px-3 py-1"
        >
          {requests.length} pending
        </Badge>
      </motion.div>

      <div className="space-y-4">
        {requests.map((request, index) => {
          const isProcessing = processingRequests.has(request.id);
          const showRequestDetails = showDetails.has(request.id);
          const timeLeft = getTimeLeft(request.expiresAt);

          return (
            <motion.div
              key={request.id}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{
                delay: index * 0.1,
                duration: 0.5,
                type: "spring",
                bounce: 0.3,
              }}
              className="relative"
            >
              {/* Glow effect */}
              <motion.div
                className="absolute -inset-1 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-2xl blur-lg"
                animate={{
                  opacity: [0.3, 0.6, 0.3],
                  scale: [1, 1.02, 1],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />

              <Card
                className={`relative bg-white/10 backdrop-blur-xl border-white/20 hover:bg-white/15 transition-all duration-300 overflow-hidden ${
                  timeLeft <= 0 ? "opacity-60" : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="space-y-6">
                    {/* Main request info */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-4">
                        <motion.div
                          whileHover={{ scale: 1.1, rotate: 5 }}
                          transition={{ type: "spring", stiffness: 300 }}
                          className="relative"
                        >
                          <Avatar className="w-16 h-16 border-2 border-white/20">
                            <AvatarImage
                              src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.senderEmail}`}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-purple-400 to-pink-500 text-white font-bold text-xl">
                              {request.senderUsername?.charAt(0) ||
                                request.senderEmail.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>

                          {/* Online indicator */}
                          <motion.div
                            className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white"
                            animate={{ scale: [1, 1.2, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        </motion.div>

                        <div className="flex-1">
                          <motion.h3
                            className="text-white font-bold text-xl"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                          >
                            {request.senderUsername ||
                              request.senderEmail.split("@")[0]}
                          </motion.h3>

                          <motion.div
                            className="flex items-center space-x-2 text-white/70 text-sm mt-1"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.3 }}
                          >
                            <Mail className="w-4 h-4" />
                            <span>{request.senderEmail}</span>
                          </motion.div>

                          <motion.div
                            className="flex items-center space-x-4 text-white/60 text-xs mt-2"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                          >
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3" />
                              <span>
                                Received{" "}
                                {getTimeSinceReceived(request.timestamp)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>Expires in {formatTimeLeft(timeLeft)}</span>
                            </div>
                          </motion.div>
                        </div>
                      </div>

                      <motion.button
                        onClick={() => toggleDetails(request.id)}
                        className="text-white/60 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Info className="w-5 h-5" />
                      </motion.button>
                    </div>

                    {/* Request message */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="bg-white/5 rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-start space-x-3">
                        <MessageCircle className="w-5 h-5 text-blue-400 mt-1 flex-shrink-0" />
                        <div>
                          <p className="text-white/90 font-medium mb-1">
                            Connection Request
                          </p>
                          <p className="text-white/70 text-sm">
                            {request.senderUsername || "This person"} wants to
                            connect and start chatting with you securely.
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    {/* Detailed info */}
                    <AnimatePresence>
                      {showRequestDetails && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="bg-white/5 rounded-xl p-4 border border-white/10 space-y-3"
                        >
                          <h4 className="text-white font-medium flex items-center space-x-2">
                            <Shield className="w-4 h-4" />
                            <span>Request Details</span>
                          </h4>

                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                              <span className="text-white/60">Request ID:</span>
                              <p className="text-white font-mono text-xs">
                                {request.id.slice(-8)}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-white/60">
                                Invite Code:
                              </span>
                              <p className="text-white font-mono text-xs">
                                {request.code}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <span className="text-white/60">Status:</span>
                              <Badge
                                variant="outline"
                                className="bg-yellow-500/20 border-yellow-400/50 text-yellow-300"
                              >
                                {request.status}
                              </Badge>
                            </div>
                            <div className="space-y-1">
                              <span className="text-white/60">Security:</span>
                              <div className="flex items-center space-x-1">
                                <Shield className="w-3 h-3 text-green-400" />
                                <span className="text-green-400 text-xs">
                                  Verified
                                </span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Quick response selection */}
                    {timeLeft > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="space-y-3"
                      >
                        <h4 className="text-white font-medium text-sm flex items-center space-x-2">
                          <Smile className="w-4 h-4" />
                          <span>Quick Response (optional)</span>
                        </h4>

                        <div className="grid grid-cols-2 gap-2">
                          {quickResponses.map((response, idx) => (
                            <motion.button
                              key={idx}
                              onClick={() =>
                                setQuickResponse(request.id, response)
                              }
                              className={`text-left p-3 rounded-lg text-sm transition-all duration-200 ${
                                selectedResponses[request.id] === response
                                  ? "bg-purple-500/30 border border-purple-400/50 text-purple-200"
                                  : "bg-white/5 border border-white/10 text-white/80 hover:bg-white/10"
                              }`}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              {response}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    )}

                    {/* Action buttons */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="flex flex-col sm:flex-row gap-3"
                    >
                      {timeLeft > 0 ? (
                        <>
                          {/* Accept button */}
                          <motion.div
                            className="flex-1"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                          >
                            <Button
                              onClick={() =>
                                handleAcceptWithResponse(request.id)
                              }
                              disabled={isProcessing}
                              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white h-12 font-medium relative overflow-hidden border-0"
                            >
                              {isProcessing ? (
                                <motion.div
                                  className="flex items-center space-x-2"
                                  animate={{ opacity: [0.5, 1, 0.5] }}
                                  transition={{ duration: 1, repeat: Infinity }}
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
                                <div className="flex items-center space-x-2">
                                  <Heart className="w-5 h-5" />
                                  <span>Accept & Connect</span>
                                </div>
                              )}
                            </Button>
                          </motion.div>

                          {/* Reject options */}
                          <div className="flex-1 space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                              {rejectionReasons
                                .slice(0, 2)
                                .map((reason, idx) => (
                                  <motion.div
                                    key={idx}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    <Button
                                      onClick={() =>
                                        handleRejectWithReason(
                                          request.id,
                                          reason,
                                        )
                                      }
                                      disabled={isProcessing}
                                      variant="outline"
                                      className="w-full bg-white/5 hover:bg-red-500/20 border-white/20 hover:border-red-400/50 text-white hover:text-red-300 h-10 text-xs"
                                    >
                                      {reason}
                                    </Button>
                                  </motion.div>
                                ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="w-full text-center py-4">
                          <Badge
                            variant="outline"
                            className="bg-red-500/20 border-red-400/50 text-red-300"
                          >
                            This invite request has expired
                          </Badge>
                        </div>
                      )}
                    </motion.div>

                    {/* Progress bar for expiry */}
                    {timeLeft > 0 && (
                      <motion.div
                        className="relative"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.8 }}
                      >
                        <div className="w-full bg-white/10 rounded-full h-1 overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                            initial={{ width: "100%" }}
                            animate={{
                              width: `${Math.max(0, (timeLeft / (24 * 60 * 60)) * 100)}%`,
                            }}
                            transition={{ duration: 1 }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
