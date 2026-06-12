"use client";

import React, { useState } from "react";
import { 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  ArrowRight, 
  Smartphone,
  Info
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      alert("Please enter a valid email address");
      return;
    }

    setIsLoading(true);
    try {
      // Deterministically generate private key from email
      const encoder = new TextEncoder();
      const data = encoder.encode(email.trim().toLowerCase() + "rosa-open-house-london-2026-salt");
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
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
                Arbitrum Sepolia
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
            ROSA digitizes the global tradition of community-based rotating savings circles 
            (Sou-Sous, Tandas, and Partnerhands). Save securely on-chain, auto-deposit monthly, 
            and earn yields on your idle capital.
          </p>

          <form onSubmit={handleConnect} className="max-w-md mx-auto lg:mx-0 space-y-4">
            <div className="relative">
              <input
                type="email"
                required
                placeholder="Enter your email to connect..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-14 pl-5 pr-12 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50 transition"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button
                type="submit"
                disabled={isLoading || !email.trim()}
                className="w-full sm:w-auto px-8 h-14 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-600/30 disabled:to-indigo-500/30 disabled:text-slate-500 text-white font-semibold rounded-2xl flex items-center justify-center space-x-3 shadow-lg shadow-violet-600/20 transition duration-200"
              >
                {isLoading ? (
                  <div className="h-5 w-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Smartphone className="h-5 w-5" />
                    <span>Login with Social / Email</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
              <div className="flex items-center space-x-2 text-xs text-slate-400">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Multi-Device Social Accounts</span>
              </div>
            </div>
          </form>
        </div>

        {/* Dynamic Graphic Mockup */}
        <div className="flex-1 w-full max-w-md aspect-square rounded-3xl bg-gradient-to-tr from-white/5 to-white/10 p-[1px] shadow-2xl relative">
          <div className="absolute inset-0 bg-gradient-to-b from-[#111827]/80 to-[#090D16]/90 rounded-[23px] p-8 flex flex-col justify-between overflow-hidden">
            {/* Visual Glassmorphic Circle Progress */}
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider block">Active Circle</span>
                <span className="text-xl font-bold text-white">London Devs Pot</span>
              </div>
              <div className="h-8 w-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-violet-400" />
              </div>
            </div>

            <div className="my-auto py-6 flex flex-col items-center justify-center relative">
              {/* Outer Glow Ring */}
              <div className="h-48 w-48 rounded-full border-4 border-dashed border-violet-500/20 flex items-center justify-center relative animate-[spin_60s_linear_infinite]">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-emerald-400 shadow-lg shadow-emerald-400/50" />
              </div>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold text-white">1,500 USDC</span>
                <span className="text-xs text-emerald-400 font-semibold mt-1">Next payout in 4 days</span>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Monthly Contribution</span>
                <span className="text-white font-semibold">150 USDC / member</span>
              </div>
              <div className="h-[1px] w-full bg-white/5" />
              <div className="flex justify-between text-xs text-slate-400">
                <span>Yield Pool APR</span>
                <span className="text-emerald-400 font-semibold flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +4.85% (Pendle / Aave)
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="border-t border-white/5 bg-[#090D16]/30 backdrop-blur-md py-16 z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 transition duration-300">
            <Smartphone className="h-8 w-8 text-violet-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Social / Passkey Sign-up</h3>
            <p className="text-sm text-slate-400">
              No seed phrases. Create your secure smart account using FaceID/TouchID biometrics in seconds.
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
