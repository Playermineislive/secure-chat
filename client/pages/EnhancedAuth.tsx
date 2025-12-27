import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Globe,
  Users,
  ArrowRight,
  CheckCircle,
  Mail,
  KeyRound,
  Fingerprint,
  Wifi,
  WifiOff,
  Rocket,
  X,
  Check,
  AlertTriangle,
} from "lucide-react";

export default function EnhancedAuth() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSuccess, setShowSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showFeatures, setShowFeatures] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  // Static background theme - no cycling for performance
  const backgroundTheme = {
    name: "Aurora",
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
  };

  useEffect(() => {
    // Show features after delay - no other animations
    const featuresTimer = setTimeout(() => setShowFeatures(true), 800);
    
    // Network status only
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearTimeout(featuresTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Password strength calculation - optimized
  useEffect(() => {
    if (!password) {
      setPasswordStrength(0);
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[a-z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;

    setPasswordStrength(Math.min(strength, 100));
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Enhanced validation
    if (!email.trim()) {
      setError("Email is required");
      emailRef.current?.focus();
      return;
    }
    
    if (!email.includes('@') || !email.includes('.')) {
      setError("Please enter a valid email address");
      emailRef.current?.focus();
      return;
    }

    if (!password.trim()) {
      setError("Password is required");
      passwordRef.current?.focus();
      return;
    }

    if (!isLogin) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters long");
        passwordRef.current?.focus();
        return;
      }
      
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        confirmPasswordRef.current?.focus();
        return;
      }
      
      if (passwordStrength < 60) {
        setError("Password is too weak. Please include uppercase, lowercase, numbers and special characters");
        passwordRef.current?.focus();
        return;
      }
    }

    if (!isOnline) {
      setError("No internet connection. Please check your network.");
      return;
    }

    setIsLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await signup(email, password);
      }

      if (result.success) {
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
        // Clear form state on success
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setError("");
        // Auth context will handle the state update and AppEntryPoint will transition
      } else {
        // Handle auth failure
        setError(result.message || "Authentication failed. Please try again.");
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      const errorMessage = err.message || "Authentication failed. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setPasswordStrength(0);
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength < 30) return "bg-red-500";
    if (passwordStrength < 60) return "bg-yellow-500";
    if (passwordStrength < 80) return "bg-blue-500";
    return "bg-green-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength < 30) return "Weak";
    if (passwordStrength < 60) return "Fair";
    if (passwordStrength < 80) return "Good";
    return "Strong";
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden">
      {/* Static optimized background */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{ background: backgroundTheme.gradient }}
      />

      {/* Subtle static overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-20"
        style={{
          background: `linear-gradient(45deg, 
            rgba(139, 92, 246, 0.1) 0%, 
            rgba(219, 39, 119, 0.1) 50%,
            rgba(59, 130, 246, 0.1) 100%)`
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4 py-8 lg:py-4">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start lg:items-center">
          {/* Left side - Branding and features */}
          <div className="text-center lg:text-left space-y-8">
            {/* Logo and branding */}
            <div className="space-y-4">
              <div className="flex items-center justify-center lg:justify-start space-x-4">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full blur-sm" />
                  <div className="relative w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-2xl">
                    🔒
                  </div>
                </div>

                <div>
                  <h1 className="text-4xl lg:text-5xl font-bold text-white">
                    SecureChat
                  </h1>
                  <p className="text-white/80 text-lg">
                    End-to-End Encrypted Messaging
                  </p>
                </div>
              </div>
            </div>

            {/* Features showcase */}
            {showFeatures && (
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    icon: Shield,
                    title: "Secure",
                    desc: "End-to-end encryption",
                  },
                  {
                    icon: Sparkles,
                    title: "Beautiful",
                    desc: "10+ stunning themes",
                  },
                  { icon: Zap, title: "Fast", desc: "Real-time messaging" },
                  {
                    icon: Globe,
                    title: "Connected",
                    desc: "Weather-based themes",
                  },
                ].map((feature, index) => (
                  <div
                    key={index}
                    className="bg-white/10 rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-colors duration-300 cursor-pointer"
                  >
                    <feature.icon className="w-8 h-8 text-white mb-2" />
                    <h3 className="text-white font-semibold">
                      {feature.title}
                    </h3>
                    <p className="text-white/70 text-sm">{feature.desc}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Theme indicator */}
            <div className="flex items-center justify-center lg:justify-start space-x-2">
              <span className="text-white/60 text-sm">Current theme:</span>
              <Badge
                variant="outline"
                className="bg-white/10 border-white/30 text-white"
              >
                {backgroundTheme.name}
              </Badge>
            </div>
          </div>

          {/* Right side - Auth form */}
          <div className="w-full max-w-md mx-auto">
            <Card className="bg-white/10 border-white/20 shadow-2xl">
              <CardHeader className="text-center pb-6">
                <div>
                  <CardTitle className="text-2xl font-bold text-white flex items-center justify-center space-x-2">
                    {isLogin ? (
                      <KeyRound className="w-6 h-6" />
                    ) : (
                      <Users className="w-6 h-6" />
                    )}
                    <span>{isLogin ? "Welcome Back" : "Join SecureChat"}</span>
                  </CardTitle>
                  <CardDescription className="text-white/70 mt-2">
                    {isLogin
                      ? "Sign in to continue your secure conversations"
                      : "Create your account and start chatting securely"}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* Network status */}
                <div className="flex items-center justify-center space-x-2">
                  {isOnline ? (
                    <>
                      <Wifi className="w-4 h-4 text-green-400" />
                      <span className="text-green-400 text-sm">Connected</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-4 h-4 text-red-400" />
                      <span className="text-red-400 text-sm">Offline</span>
                    </>
                  )}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="auth-form space-y-4">
                  {/* Email field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="text-white font-medium flex items-center space-x-2"
                    >
                      <Mail className="w-4 h-4" />
                      <span>Email</span>
                    </Label>
                    <div className="relative">
                      <Input
                        ref={emailRef}
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setFocusedField("email")}
                        onBlur={() => setFocusedField(null)}
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 transition-colors duration-300"
                        placeholder="Enter your email"
                        required
                      />
                      {focusedField === "email" && (
                        <div className="absolute inset-0 rounded-md border-2 border-purple-400/50 pointer-events-none" />
                      )}
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="password"
                      className="text-white font-medium flex items-center space-x-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>Password</span>
                    </Label>
                    <div className="relative">
                      <Input
                        ref={passwordRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setFocusedField("password")}
                        onBlur={() => setFocusedField(null)}
                        className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 transition-colors duration-300 pr-12"
                        placeholder="Enter your password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      {focusedField === "password" && (
                        <div className="absolute inset-0 rounded-md border-2 border-purple-400/50 pointer-events-none" />
                      )}
                    </div>

                    {/* Password strength indicator */}
                    {!isLogin && password && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white/70">
                            Password strength:
                          </span>
                          <span
                            className={`font-medium ${
                              passwordStrength < 30
                                ? "text-red-400"
                                : passwordStrength < 60
                                  ? "text-yellow-400"
                                  : passwordStrength < 80
                                    ? "text-blue-400"
                                    : "text-green-400"
                            }`}
                          >
                            {getPasswordStrengthText()}
                          </span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                            style={{ width: `${passwordStrength}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm password field */}
                  {!isLogin && (
                    <div className="space-y-2">
                      <Label
                        htmlFor="confirmPassword"
                        className="text-white font-medium flex items-center space-x-2"
                      >
                        <Fingerprint className="w-4 h-4" />
                        <span>Confirm Password</span>
                      </Label>
                      <div className="relative">
                        <Input
                          ref={confirmPasswordRef}
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField("confirmPassword")}
                          onBlur={() => setFocusedField(null)}
                          className="bg-white/10 border-white/30 text-white placeholder:text-white/60 focus:border-white/50 transition-colors duration-300 pr-12"
                          placeholder="Confirm your password"
                          aria-describedby="password-match-status"
                          required
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white transition-colors z-10"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        {focusedField === "confirmPassword" && (
                          <div className="absolute inset-0 rounded-md border-2 border-purple-400/50 pointer-events-none" />
                        )}
                      </div>

                      {/* Password match indicator */}
                      {confirmPassword && (
                        <div className="flex items-center space-x-2">
                          {password === confirmPassword ? (
                            <>
                              <Check className="w-4 h-4 text-green-400" />
                              <span className="text-green-400 text-sm">
                                Passwords match
                              </span>
                            </>
                          ) : (
                            <>
                              <X className="w-4 h-4 text-red-400" />
                              <span className="text-red-400 text-sm">
                                Passwords don't match
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Error message */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Alert className="bg-red-500/20 border-red-400/50">
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription className="text-red-200">
                            {error}
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Success message */}
                  <AnimatePresence>
                    {showSuccess && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.9 }}
                      >
                        <Alert className="bg-green-500/20 border-green-400/50">
                          <CheckCircle className="w-4 h-4" />
                          <AlertDescription className="text-green-200">
                            {isLogin
                              ? "Login successful! Redirecting..."
                              : "Account created successfully!"}
                          </AlertDescription>
                        </Alert>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit button */}
                  <div>
                    <Button
                      type="submit"
                      disabled={isLoading || !isOnline || (!isLogin && passwordStrength < 60 && password)}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>
                            {isLogin ? "Signing in..." : "Creating account..."}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          {isLogin ? (
                            <ArrowRight className="w-5 h-5" />
                          ) : (
                            <Rocket className="w-5 h-5" />
                          )}
                          <span>{isLogin ? "Sign In" : "Create Account"}</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </form>

                {/* Toggle mode */}
                <div className="text-center pt-4 border-t border-white/20">
                  <p className="text-white/70 text-sm mb-3">
                    {isLogin
                      ? "Don't have an account?"
                      : "Already have an account?"}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={toggleMode}
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/50 transition-all duration-300"
                  >
                    {isLogin ? "Create Account" : "Sign In"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
