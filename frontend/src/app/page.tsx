"use client";

import React, { useState, useEffect } from "react";
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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Simulator States
  const [simMembers, setSimMembers] = useState(5);
  const [simContribution, setSimContribution] = useState(50);
  const [simRound, setSimRound] = useState(4);
  const [simApy, setSimApy] = useState(5.4);
  const [isAutoStepping, setIsAutoStepping] = useState(true);

  // Registration states
  const [generatedRecoveryKey, setGeneratedRecoveryKey] = useState("");
  const [hasConfirmedSave, setHasConfirmedSave] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  // Check login state
  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedKey = localStorage.getItem("rosa_demo_key");
      if (storedKey) {
        setIsLoggedIn(true);
      }
    }
  }, []);

  // Auto step rotation simulation for dynamic visuals
  useEffect(() => {
    if (!isAutoStepping) return;
    const interval = setInterval(() => {
      setSimRound(prev => (prev % simMembers) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [simMembers, isAutoStepping]);

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
      
      const passwordData = encoder.encode(password.trim() + "rosa-verify-salt");
      const passwordHashBuffer = await window.crypto.subtle.digest("SHA-256", passwordData);
      const passwordHashHex = Array.from(new Uint8Array(passwordHashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const registry = JSON.parse(localStorage.getItem("rosa_user_auth_registry") || "{}");
      const existingRecord = registry[email.trim().toLowerCase()];

      if (existingRecord) {
        if (existingRecord.passwordHash !== passwordHashHex) {
          alert("Incorrect password for this email address.");
          setIsLoading(false);
          return;
        }
      } else {
        registry[email.trim().toLowerCase()] = { passwordHash: passwordHashHex };
        localStorage.setItem("rosa_user_auth_registry", JSON.stringify(registry));
      }

      const combinedData = encoder.encode(
        email.trim().toLowerCase() + 
        password.trim() + 
        "rosa-open-house-london-2026-salt"
      );
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", combinedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      const privateKey = "0x" + hashHex;

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
      const registry = JSON.parse(localStorage.getItem("rosa_user_auth_registry") || "{}");
      const existingRecord = registry[email.trim().toLowerCase()];

      if (existingRecord) {
        alert("This email address is already registered. Please Sign In instead.");
        setIsLoading(false);
        return;
      }

      const encoder = new TextEncoder();
      
      const passwordData = encoder.encode(password.trim() + "rosa-verify-salt");
      const passwordHashBuffer = await window.crypto.subtle.digest("SHA-256", passwordData);
      const passwordHashHex = Array.from(new Uint8Array(passwordHashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      registry[email.trim().toLowerCase()] = { passwordHash: passwordHashHex };
      localStorage.setItem("rosa_user_auth_registry", JSON.stringify(registry));

      const combinedData = encoder.encode(
        email.trim().toLowerCase() + 
        password.trim() + 
        "rosa-open-house-london-2026-salt"
      );
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", combinedData);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
      const privateKey = "0x" + hashHex;

      const recKey = encodeRecoveryKey(privateKey);
      setGeneratedRecoveryKey(recKey);

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
    if (!email.trim() || !recoveryKey.trim() || !password.trim()) {
      alert("Please enter email, recovery key, and a new password.");
      return;
    }

    setIsLoading(true);
    try {
      const formattedKey = recoveryKey.trim();
      const cleanKey = formattedKey.startsWith("ROSA-") ? formattedKey : "ROSA-" + formattedKey;
      
      if (cleanKey.replace(/-/g, "").length !== 68) {
        alert("Invalid Recovery Key format. Please check the key and try again.");
        setIsLoading(false);
        return;
      }

      const privateKey = decodeRecoveryKey(cleanKey);

      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password.trim() + "rosa-verify-salt");
      const passwordHashBuffer = await window.crypto.subtle.digest("SHA-256", passwordData);
      const passwordHashHex = Array.from(new Uint8Array(passwordHashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

      const registry = JSON.parse(localStorage.getItem("rosa_user_auth_registry") || "{}");
      registry[email.trim().toLowerCase()] = { passwordHash: passwordHashHex };
      localStorage.setItem("rosa_user_auth_registry", JSON.stringify(registry));

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

  // Member names for visual timeline and preview circle
  const previewMembers = [
    { name: "You (Member #1)", avatar: "Y" },
    { name: "Amina (Member #2)", avatar: "A" },
    { name: "Carlos (Member #3)", avatar: "C" },
    { name: "Fatima (Member #4)", avatar: "F" },
    { name: "Elena (Member #5)", avatar: "E" },
    { name: "Kwame (Member #6)", avatar: "K" }
  ];

  const activePreviewMembers = previewMembers.slice(0, simMembers);
  const totalPot = simMembers * simContribution;
  // Calculate DeFi savings interest
  const estYield = (totalPot / 2) * (simApy / 100) * (simMembers / 12);

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-[#030712]">
      {/* Background glow effects */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-violet-600/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full bg-emerald-600/5 blur-[150px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#030712]/50 backdrop-blur-md z-20">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-violet-600 to-emerald-400 p-[1px]">
              <div className="h-full w-full bg-[#030712] rounded-[11px] flex items-center justify-center">
                <Users className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                ROSA
              </span>
              <span className="ml-2.5 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 bg-emerald-400/10 rounded-full border border-emerald-400/20 uppercase tracking-wide">
                Stylus ROSCA
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-violet-600/15 transition flex items-center space-x-1.5"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-white/10 transition cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center justify-between gap-12 py-12 lg:py-20 z-10 w-full">
        
        {/* Left Column - Product Explanation */}
        <div className="flex-1 space-y-8 text-center lg:text-left max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-violet-600/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
            <Users className="h-3.5 w-3.5 text-violet-400" />
            <span>Decentralized Rotating Savings (ROSCAs)</span>
          </div>
          
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Save and grow <br />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              together
            </span>
          </h1>
          
          <div className="space-y-4 text-slate-400 text-sm leading-relaxed">
            <p>
              Before modern banking, communities globally saved together through rotating savings associations. Known traditionally as a <strong>Sou-Sou</strong> in the Caribbean, <strong>Tanda</strong> in Latin America, <strong>Esusu</strong> in West Africa, or <strong>Partnerhand</strong> in the UK.
            </p>
            <p>
              ROSA digitizes this age-old custom. Members contribute a fixed amount each round, and one member takes turns receiving the full pooled pot. By deploying smart accounts and optional smart contract security deposits, we completely eliminate default risk while generating real DeFi yield on idle assets.
            </p>
          </div>

          {/* Key Pillars */}
          <div className="grid sm:grid-cols-3 gap-4 text-left pt-2">
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <ShieldCheck className="h-5 w-5 text-violet-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security Deposits</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Collateral backing protects the pool from default losses.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">DeFi Yield Boost</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Idle deposits earn yield, boosting final payout sizes.</p>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
              <Zap className="h-5 w-5 text-teal-400" />
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Auto Direct Debit</h4>
              <p className="text-[10px] text-slate-500 leading-tight">Session keys automate direct-debit contributions.</p>
            </div>
          </div>
        </div>

        {/* Right Column - Live Savings Circle Visual Preview */}
        <div className="flex-1 w-full max-w-xl">
          <div className="flex flex-col md:flex-row items-center justify-around gap-8">
            
            {/* Circular SVG map */}
            <div className="relative w-48 h-48 shrink-0">
              <svg viewBox="0 0 220 220" className="w-full h-full">
                {/* Rotation Path Ring */}
                <circle cx="110" cy="110" r="72" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" strokeDasharray="4 4" />
                
                {/* Center Pot Indicator */}
                <circle cx="110" cy="110" r="36" fill="#030712" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                <text x="110" y="104" textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="8" fontWeight="bold" className="uppercase tracking-wider">Total Pot</text>
                <text x="110" y="121" textAnchor="middle" fill="#34d399" fontSize="15" fontWeight="bold">${totalPot}</text>
                
                {/* Line from center pointing to active payout turn */}
                {(() => {
                  const angle = ((simRound - 1) * 2 * Math.PI) / simMembers - Math.PI / 2;
                  const x = 110 + 72 * Math.cos(angle);
                  const y = 110 + 72 * Math.sin(angle);
                  return (
                    <>
                      <line x1="110" y1="110" x2={x} y2={y} stroke="rgba(16, 185, 129, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={x} cy={y} r={20} fill="none" stroke="#10b981" strokeWidth="1" opacity="0.3" />
                    </>
                  );
                })()}

                {/* Render Circle Nodes */}
                {activePreviewMembers.map((m, idx) => {
                  const angle = (idx * 2 * Math.PI) / simMembers - Math.PI / 2;
                  const x = 110 + 72 * Math.cos(angle);
                  const y = 110 + 72 * Math.sin(angle);
                  const isActive = idx === simRound - 1;
                  const isPaid = idx < simRound - 1;

                  let strokeColor = "rgba(255, 255, 255, 0.15)";
                  let fill = "rgba(17, 24, 39, 0.9)";
                  let r = isActive ? 18 : 15;

                  if (isActive) {
                    strokeColor = "#10b981";
                    fill = "#10b981";
                  } else if (isPaid) {
                    strokeColor = "#10b981";
                    fill = "rgba(16, 185, 129, 0.1)";
                  }

                  return (
                    <g key={idx} className="transition-all duration-300">
                      <circle cx={x} cy={y} r={r} fill={fill} stroke={strokeColor} strokeWidth={isActive ? 2 : 1.5} />
                      <text x={x} y={y} textAnchor="middle" dy=".3em" fill="#fff" fontSize={isActive ? 11 : 10} fontWeight={isActive ? "bold" : "normal"}>
                        {m.avatar}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Timeline schedule */}
            <div className="flex-1 w-full space-y-2.5">
              <span className="text-[11px] uppercase font-bold tracking-wider text-slate-400 block mb-2">Payout Schedule</span>
              <div className="space-y-2 max-h-[230px] overflow-y-auto pr-1">
                {activePreviewMembers.map((m, idx) => {
                  const isPaid = idx < simRound - 1;
                  const isActive = idx === simRound - 1;

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition duration-300 ${
                        isActive 
                          ? "bg-[#10b981]/10 border-[#10b981]/30 shadow-md" 
                          : "bg-[#030712]/50 border-white/5"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPaid 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" 
                            : isActive 
                              ? "bg-emerald-500 text-[#030712]" 
                              : "bg-white/5 text-slate-500 border border-white/10"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-slate-400"}`}>
                          {m.name === "You (Member #1)" ? "You" : m.name.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-right">
                        <span className={`text-[12px] font-mono font-bold ${isActive ? "text-emerald-400" : "text-slate-400"}`}>
                          +${totalPot}
                        </span>
                        {isPaid ? (
                          <span className="text-[8px] uppercase font-bold text-emerald-500/80 ml-1">Paid</span>
                        ) : isActive ? (
                          <span className="text-[8px] uppercase font-bold text-amber-400 ml-1">Now</span>
                        ) : (
                          <span className="text-[8px] uppercase font-bold text-slate-600 ml-1">Wait</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </main>

      {/* Features Section */}
      <section className="border-t border-white/5 bg-[#090D16]/30 backdrop-blur-md py-16 z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <Smartphone className="h-8 w-8 text-violet-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Social / Email Sign-up</h3>
            <p className="text-sm text-slate-400">
              Deterministic recovery keys. Restore your secure smart account on any device.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <Zap className="h-8 w-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Automated Direct Debit</h3>
            <p className="text-sm text-slate-400">
              Authorise Session Keys once. The pool contract pulls contributions automatically. No reminders needed.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <TrendingUp className="h-8 w-8 text-teal-400 mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Yield-Bearing Pools</h3>
            <p className="text-sm text-slate-400">
              Idle capital is deposited into yield strategies. Yield is split back to members when the pot rotates.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
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
