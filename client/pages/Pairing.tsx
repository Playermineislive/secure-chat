import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Copy, 
  RefreshCw, 
  Users, 
  Clock, 
  ShieldCheck,
  CheckCircle,
  Link,
  ArrowRight,
  Wifi
} from 'lucide-react';
import { 
  GenerateCodeResponse, 
  ConnectCodeResponse, 
  ConnectionStatus 
} from '@shared/api';
import { motion, AnimatePresence } from 'framer-motion';

interface PairingProps {
  onPaired: (partnerInfo: { id: string; email: string }) => void;
}

export default function Pairing({ onPaired }: PairingProps) {
  const { token } = useAuth();
  const { clearMessages } = useSocket();
  const [activeTab, setActiveTab] = useState('generate');
  
  // States
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  
  const [connectCode, setConnectCode] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState(false);
  
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus | null>(null);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [partner, setPartner] = useState<{ id: string; email: string } | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // --- Logic (Identical functionality, improved flow) ---

  useEffect(() => {
    disconnectExisting().then(() => checkConnectionStatus());
  }, []);

  const disconnectExisting = async () => {
    try {
      await fetch('/api/pairing/disconnect', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
    } catch (e) { /* ignore */ }
  };

  useEffect(() => {
    if (codeExpiry) {
      const interval = setInterval(() => {
        const diff = codeExpiry.getTime() - new Date().getTime();
        if (diff <= 0) {
          setTimeLeft(0);
          setGeneratedCode('');
          setCodeExpiry(null);
        } else {
          setTimeLeft(Math.floor(diff / 1000));
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [codeExpiry]);

  // Polling
  useEffect(() => {
    if (!connectionStatus?.isConnected && !isCheckingStatus) {
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch('/api/pairing/status', {
            headers: { 'Authorization': `Bearer ${token}` },
          });
          if (res.ok) {
            const status: ConnectionStatus = await res.json();
            if (status.isConnected && status.partnerEmail) {
              setPartner({ id: status.partnerId!, email: status.partnerEmail });
              clearMessages();
              onPaired({ id: status.partnerId!, email: status.partnerEmail });
            }
          }
        } catch (e) { console.error(e); }
      }, 2000);
      return () => clearInterval(pollInterval);
    }
  }, [connectionStatus?.isConnected, isCheckingStatus, token, onPaired, clearMessages]);

  const checkConnectionStatus = async () => {
    try {
      const res = await fetch('/api/pairing/status', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const status = await res.json();
        setConnectionStatus(status);
        if (status.isConnected && status.partnerEmail) {
          setPartner({ id: status.partnerId!, email: status.partnerEmail });
        }
      }
    } catch (e) { console.error(e); }
    finally { setIsCheckingStatus(false); }
  };

  const generateCode = async () => {
    setIsGenerating(true);
    setGenerateError('');
    try {
      await disconnectExisting();
      const res = await fetch('/api/pairing/generate-code', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data: GenerateCodeResponse = await res.json();
      if (data.success && data.code) {
        setGeneratedCode(data.code);
        setCodeExpiry(new Date(data.expiresAt!));
      } else {
        setGenerateError(data.message || 'Failed to generate');
      }
    } catch (e) { setGenerateError('Network error'); }
    finally { setIsGenerating(false); }
  };

  const connectWithCode = async () => {
    if (!connectCode.trim()) return;
    setIsConnecting(true);
    setConnectError('');
    try {
      await disconnectExisting();
      const res = await fetch('/api/pairing/connect-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ code: connectCode.trim().toUpperCase() }),
      });
      const data: ConnectCodeResponse = await res.json();
      if (data.success) {
        setPartner({ id: data.partnerId!, email: data.partnerEmail! });
        setConnectSuccess(true);
        clearMessages();
        setTimeout(() => onPaired({ id: data.partnerId!, email: data.partnerEmail! }), 1500);
      } else {
        setConnectError(data.message || 'Failed to connect');
      }
    } catch (e) { setConnectError('Network error'); }
    finally { setIsConnecting(false); }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // --- UI RENDER ---

  // 1. Initial Loading
  if (isCheckingStatus) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 flex flex-col items-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
          <p className="text-slate-600 font-medium">Checking status...</p>
        </div>
      </div>
    );
  }

  // 2. Success State
  if (connectionStatus?.isConnected && partner) {
    return (
      <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 font-sans text-slate-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100"
        >
          <div className="bg-green-50 p-8 text-center border-b border-green-100">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-green-800">Connected!</h2>
            <p className="text-green-600 mt-1">Secure channel established</p>
          </div>
          
          <div className="p-6 space-y-6">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold text-lg">
                {partner.email.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Chatting with</p>
                <p className="text-slate-900 font-medium">{partner.email}</p>
              </div>
            </div>

            <Button 
              onClick={() => onPaired(partner)}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-200 transition-all"
            >
              Start Chatting <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // 3. Main Pairing Interface
  return (
    <div className="min-h-screen bg-[#F0F2F5] flex items-center justify-center p-4 font-sans text-slate-900">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white border-0 shadow-xl rounded-2xl overflow-hidden">
          <CardHeader className="text-center pb-2 bg-slate-50/50 border-b border-slate-100">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200 transform rotate-3">
              <Link className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">Secure Pairing</CardTitle>
            <CardDescription className="text-slate-500">
              Connect devices securely to start chatting
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-100 p-1 rounded-xl mb-6">
                <TabsTrigger 
                  value="generate"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500 transition-all"
                >
                  Generate Code
                </TabsTrigger>
                <TabsTrigger 
                  value="connect"
                  className="rounded-lg data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm text-slate-500 transition-all"
                >
                  Enter Code
                </TabsTrigger>
              </TabsList>

              {/* GENERATE TAB */}
              <TabsContent value="generate" className="space-y-6">
                <AnimatePresence>
                  {generateError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Alert className="bg-red-50 text-red-600 border-red-200">
                        <AlertDescription>{generateError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                {generatedCode ? (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center relative overflow-hidden">
                      {/* Decorative background stripes */}
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
                      
                      <Label className="text-slate-400 text-xs font-bold uppercase tracking-wider block mb-2">Share this code</Label>
                      
                      <div className="flex items-center justify-center space-x-3 mb-4">
                        <span className="text-4xl font-mono font-bold text-slate-800 tracking-[0.2em]">
                          {generatedCode}
                        </span>
                        <button 
                          onClick={() => navigator.clipboard.writeText(generatedCode)} 
                          className="p-2 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                          title="Copy"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                      </div>

                      {timeLeft > 0 ? (
                        <div className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium border border-blue-100">
                          <Clock className="w-3 h-3 mr-1.5" />
                          Expires in {formatTime(timeLeft)}
                        </div>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">Code Expired</span>
                      )}
                    </div>

                    <div className="flex items-center justify-center space-x-2 text-indigo-600 bg-indigo-50 p-3 rounded-xl">
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
                      </span>
                      <span className="text-sm font-medium">Waiting for partner...</span>
                    </div>

                    <Button variant="outline" onClick={generateCode} className="w-full border-slate-200 text-slate-600 hover:bg-slate-50">
                      <RefreshCw className="w-4 h-4 mr-2" /> Generate New Code
                    </Button>
                  </motion.div>
                ) : (
                  <div className="text-center py-4 space-y-4">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                      <Wifi className="w-10 h-10" />
                    </div>
                    <p className="text-slate-500 text-sm px-4">
                      Create a temporary secure code to pair with a new device or partner.
                    </p>
                    <Button 
                      onClick={generateCode} 
                      disabled={isGenerating}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                      {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : "Generate Code"}
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* CONNECT TAB */}
              <TabsContent value="connect" className="space-y-5 mt-2">
                <AnimatePresence>
                  {connectError && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
                      <Alert variant="destructive" className="bg-red-50 text-red-600 border-red-200">
                        <AlertDescription>{connectError}</AlertDescription>
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div className="space-y-2">
                  <Label htmlFor="code" className="text-slate-700 font-medium">Partner's Code</Label>
                  <Input
                    id="code"
                    value={connectCode}
                    onChange={(e) => {
                      const val = e.target.value.toUpperCase();
                      setConnectCode(val);
                      if (val.length === 6 && !isConnecting) setTimeout(() => connectWithCode(), 500);
                    }}
                    placeholder="XYZ123"
                    className="h-14 text-center text-2xl font-mono tracking-widest uppercase bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/50"
                    maxLength={6}
                    disabled={isConnecting}
                  />
                  <p className="text-xs text-slate-400 text-center">Enter the 6-character code shown on partner's screen</p>
                </div>

                <Button 
                  onClick={connectWithCode}
                  disabled={isConnecting || connectCode.length < 6}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 rounded-xl font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {isConnecting ? (
                    <div className="flex items-center"><Loader2 className="w-5 h-5 animate-spin mr-2" /> Connecting...</div>
                  ) : (
                    <div className="flex items-center"><Users className="w-5 h-5 mr-2" /> Connect Partner</div>
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </CardContent>

          {/* Footer Security Badge */}
          <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-center text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-green-500 mr-2" />
            <span>End-to-End Encrypted • Zero Knowledge</span>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
