import React, { Component, ErrorInfo, ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  RefreshCw,
  Bug,
  Home,
  Copy,
  Send,
  Shield,
  Wifi,
  WifiOff,
  ExternalLink,
} from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isOnline: boolean;
  errorId: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: navigator.onLine,
      errorId: "",
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(2, 15),
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Log error to console for debugging
    console.error("ErrorBoundary caught an error:", error, errorInfo);

    // In production, you'd send this to your error reporting service
    this.reportError(error, errorInfo);
  }

  componentDidMount() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
    window.addEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection,
    );
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
    window.removeEventListener(
      "unhandledrejection",
      this.handleUnhandledRejection,
    );
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    console.error("Unhandled promise rejection:", event.reason);
    event.preventDefault();
  };

  reportError = async (error: Error, errorInfo: ErrorInfo) => {
    try {
      // In production, replace with your error reporting service
      const errorReport = {
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        errorId: this.state.errorId,
      };

      console.log("Error report:", errorReport);

      // Example: Send to error reporting service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(errorReport)
      // });
    } catch (reportingError) {
      console.error("Failed to report error:", reportingError);
    }
  };

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
      });
    } else {
      // Force reload if retries exhausted
      window.location.reload();
    }
  };

  handleGoHome = () => {
    window.location.href = "/";
  };

  handleCopyError = () => {
    const errorText = `
Error ID: ${this.state.errorId}
Message: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard
      .writeText(errorText)
      .then(() => {
        alert("Error details copied to clipboard");
      })
      .catch(() => {
        console.error("Failed to copy error details");
      });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-900 via-purple-900 to-blue-900 flex items-center justify-center p-4 relative overflow-hidden">
          {/* Animated background */}
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(10)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 bg-white/10 rounded-full"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  y: [0, -30, 0],
                  opacity: [0.2, 0.6, 0.2],
                  scale: [0.5, 1, 0.5],
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

          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-2xl relative z-10"
          >
            <Card className="bg-white/10 backdrop-blur-xl border-white/20 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="mx-auto w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-4"
                >
                  <motion.div
                    animate={{ rotate: [0, 10, -10, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Bug className="w-10 h-10 text-red-400" />
                  </motion.div>
                </motion.div>

                <CardTitle className="text-2xl font-bold text-white mb-2">
                  Oops! Something went wrong
                </CardTitle>

                <p className="text-white/70">
                  Don't worry, we're here to help you get back on track.
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Network status */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Alert
                    className={`${
                      this.state.isOnline
                        ? "bg-green-500/20 border-green-400/50"
                        : "bg-red-500/20 border-red-400/50"
                    }`}
                  >
                    {this.state.isOnline ? (
                      <Wifi className="w-4 h-4" />
                    ) : (
                      <WifiOff className="w-4 h-4" />
                    )}
                    <AlertDescription
                      className={
                        this.state.isOnline ? "text-green-200" : "text-red-200"
                      }
                    >
                      {this.state.isOnline
                        ? "Connection status: Online"
                        : "Connection status: Offline - Please check your internet connection"}
                    </AlertDescription>
                  </Alert>
                </motion.div>

                {/* Error details */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <span>Error Details</span>
                  </h3>

                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-white/60">Error ID:</span>
                      <span className="text-white ml-2 font-mono">
                        {this.state.errorId}
                      </span>
                    </div>

                    <div>
                      <span className="text-white/60">Message:</span>
                      <p className="text-red-300 ml-2 break-words">
                        {this.state.error?.message || "Unknown error occurred"}
                      </p>
                    </div>

                    <div>
                      <span className="text-white/60">Time:</span>
                      <span className="text-white ml-2">
                        {new Date().toLocaleString()}
                      </span>
                    </div>
                  </div>
                </motion.div>

                {/* What you can do */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/5 rounded-xl p-4 border border-white/10"
                >
                  <h3 className="text-white font-semibold mb-3 flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <span>What you can do:</span>
                  </h3>

                  <ul className="space-y-2 text-white/80 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span>Try refreshing the page or restarting the app</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span>Check your internet connection</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span>Clear your browser cache and cookies</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                      <span>Contact support if the problem persists</span>
                    </li>
                  </ul>
                </motion.div>

                {/* Action buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="flex flex-col sm:flex-row gap-3"
                >
                  <Button
                    onClick={this.handleRetry}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white h-12"
                  >
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Try Again ({this.maxRetries - this.retryCount} attempts
                    left)
                  </Button>

                  <Button
                    onClick={this.handleGoHome}
                    variant="outline"
                    className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 h-12"
                  >
                    <Home className="w-5 h-5 mr-2" />
                    Go Home
                  </Button>
                </motion.div>

                {/* Additional actions */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/10"
                >
                  <Button
                    onClick={this.handleCopyError}
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Error Details
                  </Button>

                  <Button
                    onClick={() =>
                      window.open(
                        "mailto:support@securechat.com?subject=Error Report&body=" +
                          encodeURIComponent(
                            `Error ID: ${this.state.errorId}\nMessage: ${this.state.error?.message}`,
                          ),
                      )
                    }
                    variant="outline"
                    size="sm"
                    className="flex-1 bg-white/5 border-white/20 text-white/80 hover:bg-white/10"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Report Bug
                  </Button>
                </motion.div>

                {/* Help resources */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-center text-white/60 text-sm"
                >
                  <p>Need more help? Visit our</p>
                  <div className="flex items-center justify-center space-x-4 mt-2">
                    <button
                      onClick={() => window.open("/help", "_blank")}
                      className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                    >
                      <span>Help Center</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                    <span>•</span>
                    <button
                      onClick={() => window.open("/status", "_blank")}
                      className="text-blue-400 hover:text-blue-300 flex items-center space-x-1"
                    >
                      <span>System Status</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook for functional components to report errors
export const useErrorReporting = () => {
  const reportError = (error: Error, context?: string) => {
    console.error("Manual error report:", error, context);

    // In production, send to error reporting service
    const errorReport = {
      message: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
    };

    console.log("Error report:", errorReport);
  };

  return { reportError };
};
