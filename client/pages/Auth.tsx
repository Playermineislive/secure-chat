import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Loader2, 
  MessageCircle, 
  Lock, 
  Eye, 
  EyeOff,
  Mail,
  CheckCircle,
  Shield,
  Wifi,
  WifiOff,
  Globe2,
  Fingerprint,
  Zap,
  Server,
  ArrowRight
} from 'lucide-react';

export default function Auth() {
  const { login, signup } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Network Status Listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Password Strength Logic
  useEffect(() => {
    if (isLogin) return;
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (/[A-Z]/.test(password)) strength += 25;
    if (/[0-9]/.test(password)) strength += 25;
    if (/[^A-Za-z0-9]/.test(password)) strength += 25;
    setPasswordStrength(strength);
  }, [password, isLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    if (!isOnline) {
      setError('No internet connection');
      setIsLoading(false);
      return;
    }

    if (!email || !password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }

    if (!isLogin) {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setIsLoading(false);
        return;
      }
      if (passwordStrength < 50) {
        setError('Password is too weak');
        setIsLoading(false);
        return;
      }
    }

    // Simulate UX delay for "processing" feel
    await new Promise(resolve => setTimeout(resolve, 600));

    try {
      const result = isLogin 
        ? await login(email, password)
        : await signup(email, password);

      if (!result.success) {
        setError(result.message || 'Authentication failed');
      }
    } catch (err) {
      setError('Network request failed');
    } finally {
      setIsLoading(false);
    }
  };

  // --- Components ---

  const StrengthSegment = ({ active, color }: { active: boolean, color: string }) => (
    <motion.div 
      className={`h-1.5 flex-1 rounded-full mx-0.5 transition-colors duration-300 ${active ? color : 'bg-slate-200'}`}
      initial={false}
      animate={{ scale: active ? 1 : 0.95 }}
    />
  );

  const FeatureRow = ({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="flex items-start space-x-4 p-4 rounded-xl hover:bg-slate-50 transition-colors duration-200 cursor-default">
      <div className="bg-white p-2.5 rounded-lg shadow-sm border border-slate-100 text-indigo-600">
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
        <p className="text-slate-500 text-xs mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col md:flex-row font-sans text-slate-900">
      
      {/* LEFT SIDE: Authentication Form */}
      <div className="w-full md:w-[480px] bg-white flex flex-col relative z-10 shadow-2xl">
        
        {/* Network Badge */}
        <div className={`absolute top-0 left-0 right-0 h-1 ${isOnline ? 'bg-indigo-600' : 'bg-red-500'}`} />
        {!isOnline && (
          <div className="bg-red-50 text-red-600 px-4 py-2 text-xs font-medium flex items-center justify-center">
            <WifiOff className="w-3 h-3 mr-2" /> You are currently offline
          </div>
        )}

        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 py-12 overflow-y-auto custom-scrollbar">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm mx-auto"
          >
            {/* Header */}
            <div className="mb-10">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-200 mb-6">
                <MessageCircle className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-2">
                {isLogin ? 'Welcome back' : 'Get started'}
              </h1>
              <p className="text-slate-500">
                {isLogin 
                  ? 'Please enter your details to sign in.' 
                  : 'Create a new secure account.'}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <AlertDescription className="text-sm text-red-700 font-medium">{error}</AlertDescription>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Email */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold text-sm">Email</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'email' ? 'ring-2 ring-indigo-100 rounded-lg' : ''}`}>
                  <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    className="pl-11 h-12 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all rounded-lg"
                    placeholder="Enter your email"
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-semibold text-sm">Password</Label>
                <div className={`relative transition-all duration-200 ${focusedField === 'password' ? 'ring-2 ring-indigo-100 rounded-lg' : ''}`}>
                  <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    className="pl-11 pr-11 h-12 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all rounded-lg"
                    placeholder="••••••••"
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                
                {/* Strength Meter (Only Signup) */}
                <AnimatePresence>
                  {!isLogin && password && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="pt-2"
                    >
                      <div className="flex space-x-1 mb-2">
                        <StrengthSegment active={passwordStrength >= 25} color="bg-red-500" />
                        <StrengthSegment active={passwordStrength >= 50} color="bg-orange-500" />
                        <StrengthSegment active={passwordStrength >= 75} color="bg-yellow-500" />
                        <StrengthSegment active={passwordStrength >= 100} color="bg-green-500" />
                      </div>
                      <p className="text-xs text-slate-500 text-right">
                        Strength: <span className="font-medium text-slate-700">
                          {passwordStrength < 50 ? 'Weak' : passwordStrength < 100 ? 'Good' : 'Excellent'}
                        </span>
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Confirm Password (Only Signup) */}
              <AnimatePresence>
                {!isLogin && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-2 pt-1">
                      <Label className="text-slate-700 font-semibold text-sm">Confirm Password</Label>
                      <div className={`relative transition-all duration-200 ${focusedField === 'confirm' ? 'ring-2 ring-indigo-100 rounded-lg' : ''}`}>
                        <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onFocus={() => setFocusedField('confirm')}
                          onBlur={() => setFocusedField(null)}
                          className={`pl-11 h-12 border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 transition-all rounded-lg ${
                            confirmPassword && confirmPassword !== password ? 'border-red-300 focus:border-red-500' : ''
                          }`}
                          placeholder="••••••••"
                          disabled={isLoading}
                        />
                        {confirmPassword && confirmPassword === password && (
                          <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }}
                            className="absolute right-3.5 top-3.5 text-green-500"
                          >
                            <CheckCircle className="h-5 w-5" />
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit Button */}
              <Button 
                type="submit" 
                disabled={isLoading}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98] mt-4"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Processing...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center space-x-2">
                    <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </div>
                )}
              </Button>
            </form>

            {/* Toggle Mode */}
            <div className="mt-8 text-center">
              <p className="text-sm text-slate-600">
                {isLogin ? "Don't have an account?" : "Already have an account?"}
                <button
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setPassword('');
                    setConfirmPassword('');
                  }}
                  className="ml-2 font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-colors focus:outline-none"
                >
                  {isLogin ? "Sign up" : "Log in"}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
        
        {/* Footer */}
        <div className="p-6 text-center text-xs text-slate-400 border-t border-slate-100">
          SecureChat v2.0 • End-to-End Encrypted
        </div>
      </div>

      {/* RIGHT SIDE: Features & Branding (Hidden on mobile, visible on desktop) */}
      <div className="hidden md:flex flex-1 bg-slate-50 relative overflow-hidden items-center justify-center p-12">
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%234338ca' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="max-w-lg w-full">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-4">Enterprise-grade Security. <br/>Consumer-grade Simplicity.</h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Experience the next generation of secure messaging with military-grade encryption and zero-knowledge architecture.
              </p>
            </div>

            <div className="grid gap-4">
              <FeatureRow 
                icon={Shield} 
                title="End-to-End Encryption" 
                desc="AES-256 + RSA-4096 hybrid encryption ensures only you and your recipient can read messages." 
              />
              <FeatureRow 
                icon={Zap} 
                title="Signal Protocol Ratcheting" 
                desc="Double Ratchet algorithm provides perfect forward secrecy for every single message." 
              />
              <FeatureRow 
                icon={Server} 
                title="Zero-Knowledge Architecture" 
                desc="We don't store your keys. We can't read your messages even if we wanted to." 
              />
              <FeatureRow 
                icon={Globe2} 
                title="Offline Resilient" 
                desc="Queue messages while offline. Auto-sync when you reconnect. Never lose data." 
              />
              <FeatureRow 
                icon={Fingerprint} 
                title="Biometric Ready" 
                desc="Hardware-backed key storage using Web Crypto API and secure enclaves." 
              />
            </div>
            
            <div className="pt-8 flex items-center space-x-6 text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">SOC2 Compliant</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium">Open Source</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
