"use client";

import React, { useState } from "react";
import { 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Smartphone,
  Info,
  Lock,
  Mail,
  Key,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"signin" | "register" | "recover">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryKey, setRecoveryKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Registration states
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState("");
  const [hasConfirmedSave, setHasConfirmedSave] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Convert hex private key to formatted recovery key (e.g. ROSA-XXXX-XXXX-...)
  const encodeRecoveryKey = (privKeyHex: string): string => {
    const raw = privKeyHex.replace("0x", "").toUpperCase();
    const groups = [];
    for (let i = 0; i < raw.length; i += 8) {
      groups.push(raw.substring(i, i + 8));
    }
    return "ROSA-" + groups.join("-");
  };

  // Decode formatted recovery key back to hex private key
  const decodeRecoveryKey = (keyString: string): string => {
    const raw = keyString.replace("ROSA-", "").replace(/-/g, "").toLowerCase();
    return "0x" + raw;
  };

  const handleCopyKey = () => {
    if (!generatedRecoveryKey) return;
    navigator.clipboard.writeText(generatedRecoveryKey);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  // Sign In: Derives EOA private key from Email + Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const encoder = new TextEncoder();
      const combinedData = encoder.encode(
        email.trim().toLowerCase() + 
        password.trim() + 
        "rosa-open-house-london-2026-salt"
      );
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", combinedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      const privateKey = "0x" + hashHex;

      // Store private key and email
      localStorage.setItem("rosa_demo_key", privateKey);
      localStorage.setItem("rosa_user_email", email.trim().toLowerCase());

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  // Register: Derives private key, creates Recovery Key and prompts user to save
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      alert("Please enter both email and password.");
      return;
    }

    setIsLoading(true);
    try {
      const encoder = new TextEncoder();
      const combinedData = encoder.encode(
        email.trim().toLowerCase() + 
        password.trim() + 
        "rosa-open-house-london-2026-salt"
      );
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", combinedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      const privateKey = "0x" + hashHex;

      // Generate recovery key
      const recKey = encodeRecoveryKey(privateKey);
      setGeneratedRecoveryKey(recKey);

      // Temporary local storage save but user must confirm
      localStorage.setItem("rosa_demo_key", privateKey);
      localStorage.setItem("rosa_user_email", email.trim().toLowerCase());
      
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  // Recover: Restores account using Email + Recovery Key
  const handleRecover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !recoveryKey.trim()) {
      alert("Please enter both email and recovery key.");
      return;
    }

    setIsLoading(true);
    try {
      const formattedKey = recoveryKey.trim();
      const cleanKey = formattedKey.startsWith("ROSA-") ? formattedKey : "ROSA-" + formattedKey;
      
      // Basic verification of length (ROSA- + 64 hex characters + 7 dashes = 76 characters)
      if (cleanKey.replace(/-/g, "").length !== 68) {
        alert("Invalid Recovery Key format. Please check the key and try again.");
        setIsLoading(false);
        return;
      }

      const privateKey = decodeRecoveryKey(cleanKey);

      // Store private key and email
      localStorage.setItem("rosa_demo_key", privateKey);
      localStorage.setItem("rosa_user_email", email.trim().toLowerCase());

      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      console.error(err);
      setIsLoading(false);
    }
  };

  const proceedToDashboard = () => {
    if (hasConfirmedSave) {
      window.location.href = "/dashboard";
    }
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#090D16]">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/10 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#090D16]/50 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-emerald-400 p-[1px]">
              <div className="h-full w-full bg-[#090D16] rounded-[11px] flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                ROSA
              </span>
              <span className="ml-2 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                Robinhood & Arbitrum Support
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-xs text-slate-400 border border-white/5 px-3 py-1.5 rounded-full bg-white/5">
              Stylus WASM Engine
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-center gap-12 py-16 z-10">
        <div className="flex-1 space-y-8 text-center lg:text-left">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-xs font-semibold text-violet-400">
            <Zap className="h-3 w-3" />
            <span>Arbitrum Open House London Edition</span>
          </div>
          <h1 className="text-5xl lg:text-6xl font-extrabold tracking-tight leading-none text-white">
            Save together, <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              grow together.
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
            ROSA digitizes the global tradition of rotating savings circles (Sou-Sous, Tandas, and Partnerhands) with deterministic smart accounts and yield pools.
          </p>
        </div>

        {/* Auth Container Card */}
        <div className="flex-1 w-full max-w-md bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md relative shadow-2xl overflow-hidden">
          {generatedRecoveryKey ? (
            /* Recovery Key Prompt view */
            <div className="space-y-6">
              <div className="text-center">
                <span className="text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 text-xs font-semibold px-3 py-1 rounded-full">
                  Account Created Successfully
                </span>
                <h2 className="text-xl font-bold text-white mt-3">Backup Recovery Key</h2>
                <p className="text-xs text-slate-400 mt-2">
                  This key encodes your unique private key. You can use it to sign in to your wallet from any device or recover your account if you forget your password.
                </p>
              </div>

              <div className="p-4 bg-[#090D16]/60 border border-white/5 rounded-2xl relative font-mono text-[11px] text-violet-300 leading-relaxed break-all select-all flex justify-between items-center gap-3">
                <span>{generatedRecoveryKey}</span>
                <button
                  type="button"
                  onClick={handleCopyKey}
                  className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition shrink-0"
                  title="Copy recovery key"
                >
                  {copiedKey ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-violet-600/10 border border-violet-500/20 rounded-xl">
                <input
                  type="checkbox"
                  id="confirm-backup"
                  checked={hasConfirmedSave}
                  onChange={(e) => setHasConfirmedSave(e.target.checked)}
                  className="mt-1 accent-violet-600"
                />
                <label htmlFor="confirm-backup" className="text-xs text-slate-300 cursor-pointer">
                  I have copied and written down this Recovery Key. I understand that if I lose it, my funds cannot be recovered.
                </label>
              </div>

              <button
                type="button"
                onClick={proceedToDashboard}
                disabled={!hasConfirmedSave}
                className="w-full h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-600/30 disabled:to-indigo-600/30 disabled:text-slate-500 text-white font-semibold rounded-xl flex items-center justify-center space-x-2 transition"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            /* standard login/register tabs view */
            <div className="space-y-6">
              {/* Tab headers */}
              <div className="flex border-b border-white/5 pb-2">
                <button
                  onClick={() => { setActiveTab("signin"); setIsLoading(false); }}
                  className={`flex-1 pb-2 text-sm font-semibold transition ${
                    activeTab === "signin" 
                      ? "text-white border-b-2 border-violet-500" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Sign In
                </button>
                <button
                  onClick={() => { setActiveTab("register"); setIsLoading(false); }}
                  className={`flex-1 pb-2 text-sm font-semibold transition ${
                    activeTab === "register" 
                      ? "text-white border-b-2 border-violet-500" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register
                </button>
                <button
                  onClick={() => { setActiveTab("recover"); setIsLoading(false); }}
                  className={`flex-1 pb-2 text-sm font-semibold transition ${
                    activeTab === "recover" 
                      ? "text-white border-b-2 border-violet-500" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Recover
                </button>
              </div>

              {activeTab === "signin" && (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Sign In"
                    )}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("recover")}
                      className="text-xs text-violet-400 hover:underline"
                    >
                      Forgot password? Sign in with Recovery Key
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "register" && (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Register & Create Wallet"
                    )}
                  </button>
                </form>
              )}

              {activeTab === "recover" && (
                <form onSubmit={handleRecover} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block">Secret Recovery Key</label>
                    <div className="relative">
                      <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                      <input
                        type="text"
                        required
                        placeholder="ROSA-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                        value={recoveryKey}
                        onChange={(e) => setRecoveryKey(e.target.value)}
                        className="w-full h-11 pl-11 pr-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500/50 font-mono"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-11 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center"
                  >
                    {isLoading ? (
                      <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      "Recover & Sign In"
                    )}
                  </button>
                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => setActiveTab("signin")}
                      className="text-xs text-violet-400 hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Features Section */}
      <section className="border-t border-white/5 bg-[#090D16]/30 backdrop-blur-md py-16 z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition duration-300">
            <Smartphone className="h-8 w-8 text-violet-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Social / Email Sign-up</h3>
            <p className="text-sm text-slate-400">
              Deterministic recovery keys. Restore your secure smart account on any device.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition duration-300">
            <Zap className="h-8 w-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Automated Direct Debit</h3>
            <p className="text-sm text-slate-400">
              Authorise Session Keys once. The pool contract pulls contributions automatically. No reminders needed.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition duration-300">
            <TrendingUp className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Yield-Bearing Pools</h3>
            <p className="text-sm text-slate-400">
              Idle capital is deposited into yield strategies. Yield is split back to members when the pot rotates.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition duration-300">
            <ShieldCheck className="h-8 w-8 text-violet-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Stylus Safety Guard</h3>
            <p className="text-sm text-slate-400">
              Transactions compile to WASM via Rust. Near-native speeds ensure micro-savings groups enjoy penny fees.
            </p>
          </div>
        </div>
      </section>

      {/* Info Warning Alert */}
      <div className="bg-[#111827]/50 border-t border-white/5 py-4 z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center space-x-2 text-xs text-slate-400 text-center">
          <Info className="h-4 w-4 text-violet-400 shrink-0" />
          <span>ROSA is built for the Robinhood Chain Hackathon, integrating ZeroDev AA and Arbitrum Stylus.</span>
        </div>
      </div>
    </div>
  );
}
