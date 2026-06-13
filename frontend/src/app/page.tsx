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

  // Scroll visibility states for header auto-hide
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        // scrolling down -> hide header
        setShowHeader(false);
      } else {
        // scrolling up -> show header
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

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
    <div className="flex-1 flex flex-col relative bg-[#000000]">
      {/* Header */}
      <header className={`sticky top-0 border-b border-[#303030] bg-[#000000] z-50 transition-all duration-500 ease-in-out ${
        showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}>
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-[#00C805] p-[1px]">
              <div className="h-full w-full bg-[#000000] rounded-[11px] flex items-center justify-center">
                <Users className="h-5 w-5 text-[#00C805]" />
              </div>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-white">
                ROSA
              </span>
              <span className="ml-2.5 px-2 py-0.5 text-[9px] font-semibold text-[#00C805] bg-[#00C805]/10 rounded-full border border-[#00C805]/20 uppercase tracking-wide">
                Stylus ROSCA
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              <Link
                href="/dashboard"
                className="px-4 py-2 bg-[#CCFF00] hover:bg-[#b3e600] text-[#000000] font-extrabold text-xs rounded-xl shadow-lg shadow-emerald-500/15 transition flex items-center space-x-1.5 active:scale-95 transition-transform duration-100"
              >
                <span>Dashboard</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-4 py-2 bg-[#0A0A0A] hover:bg-white/10 text-white font-semibold text-xs rounded-xl border border-[#303030] transition cursor-pointer"
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

          
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight leading-tight text-white">
            Save and grow <br />
            <span className="text-[#00C805]">
              together
            </span>
          </h1>
          
          <div className="space-y-4 text-[#8C8C8C] text-sm leading-relaxed">
            <p>
              Before modern banking, communities globally saved together through rotating savings associations. Known traditionally as a <strong>Sou-Sou</strong> in the Caribbean, <strong>Tanda</strong> in Latin America, <strong>Esusu</strong> in West Africa, or <strong>Partnerhand</strong> in the UK.
            </p>
            <p>
              ROSA digitizes this age-old custom. Members contribute a fixed amount each round, and one member takes turns receiving the full pooled pot. By deploying smart accounts and optional smart contract security deposits, we completely eliminate default risk while generating real DeFi yield on idle assets.
            </p>
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
                <circle cx="110" cy="110" r="36" fill="#000000" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                <text x="110" y="104" textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="8" fontWeight="bold" className="uppercase tracking-wider">Total Pot</text>
                <text x="110" y="121" textAnchor="middle" fill="#00C805" fontSize="15" fontWeight="bold">${totalPot}</text>
                
                {/* Line from center pointing to active payout turn */}
                {(() => {
                  const angle = ((simRound - 1) * 2 * Math.PI) / simMembers - Math.PI / 2;
                  const x = 110 + 72 * Math.cos(angle);
                  const y = 110 + 72 * Math.sin(angle);
                  return (
                    <>
                      <line x1="110" y1="110" x2={x} y2={y} stroke="rgba(0, 200, 5, 0.3)" strokeWidth="1.5" strokeDasharray="3 3" />
                      <circle cx={x} cy={y} r={20} fill="none" stroke="#00C805" strokeWidth="1" opacity="0.3" />
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
                      <text x={x} y={y} textAnchor="middle" dy=".3em" fill={isActive ? "#000000" : "#fff"} fontSize={isActive ? 11 : 10} fontWeight={isActive ? "bold" : "normal"}>
                        {m.avatar}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Timeline schedule */}
            <div className="flex-1 w-full space-y-2.5">
              <span className="text-[11px] uppercase font-bold tracking-wider text-[#8C8C8C] block mb-2">Payout Schedule</span>
              <div className="space-y-2 max-h-[230px] overflow-y-auto pr-1">
                {activePreviewMembers.map((m, idx) => {
                  const isPaid = idx < simRound - 1;
                  const isActive = idx === simRound - 1;

                  return (
                    <div 
                      key={idx} 
                      className={`flex items-center justify-between p-3.5 rounded-2xl border transition duration-300 ${
                        isActive 
                          ? "bg-[#00C805]/10 border-[#00C805]/30 shadow-md" 
                          : "bg-[#000000]/50 border-[#303030]"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isPaid 
                            ? "bg-[#00C805]/20 text-[#00C805] border border-[#00C805]/20" 
                            : isActive 
                              ? "bg-[#00C805] text-[#000000]" 
                              : "bg-[#0A0A0A] text-[#8C8C8C] border border-[#303030]"
                        }`}>
                          {idx + 1}
                        </span>
                        <span className={`text-[12px] font-semibold ${isActive ? "text-white" : "text-[#8C8C8C]"}`}>
                          {m.name === "You (Member #1)" ? "You" : m.name.split(" ")[0]}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-right">
                        <span className={`text-[12px] font-mono font-bold ${isActive ? "text-[#00C805]" : "text-[#8C8C8C]"}`}>
                          +${totalPot}
                        </span>
                        {isPaid ? (
                          <span className="text-[8px] uppercase font-bold text-[#00C805]/80 ml-1">Paid</span>
                        ) : isActive ? (
                          <span className="text-[8px] uppercase font-bold text-yellow-500 ml-1">Now</span>
                        ) : (
                          <span className="text-[8px] uppercase font-bold text-[#8C8C8C] ml-1">Wait</span>
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
      <section className="border-t border-[#303030] bg-[#000000]/30 backdrop-blur-md py-16 z-10">
        <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <Smartphone className="h-8 w-8 text-[#8C8C8C] mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Social / Email Sign-up</h3>
            <p className="text-sm text-[#8C8C8C]">
              Deterministic recovery keys. Restore your secure smart account on any device.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <Zap className="h-8 w-8 text-[#00C805] mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Automated Direct Debit</h3>
            <p className="text-sm text-[#8C8C8C]">
              Authorise Session Keys once. The pool contract pulls contributions automatically. No reminders needed.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <TrendingUp className="h-8 w-8 text-[#00C805] mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Yield-Bearing Pools</h3>
            <p className="text-sm text-[#8C8C8C]">
              Idle capital is deposited into yield strategies. Yield is split back to members when the pot rotates.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-panel glass-panel-hover">
            <ShieldCheck className="h-8 w-8 text-[#8C8C8C] mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Stylus Safety Guard</h3>
            <p className="text-sm text-[#8C8C8C]">
              Transactions compile to WASM via Rust. Near-native speeds ensure micro-savings groups enjoy penny fees.
            </p>
          </div>
        </div>
      </section>

      {/* Info Warning Alert */}
      <div className="bg-[#0A0A0A]/50 border-t border-[#303030] py-4 z-10">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-center space-x-2 text-xs text-[#8C8C8C] text-center">
          <Info className="h-4 w-4 text-[#8C8C8C] shrink-0" />
          <span>ROSA is built for the Robinhood Chain Hackathon, integrating ZeroDev AA and Arbitrum Stylus.</span>
        </div>
      </div>

      {/* Auth Modal Overlay */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="relative w-full max-w-md bg-[#000000] border border-[#303030] rounded-3xl p-8 shadow-2xl space-y-6">
            {/* Close button */}
            <button
              onClick={() => {
                setShowAuthModal(false);
                setGeneratedRecoveryKey("");
                setHasConfirmedSave(false);
              }}
              className="absolute top-4 right-4 text-[#8C8C8C] hover:text-white transition"
            >
              <span className="sr-only">Close</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {generatedRecoveryKey ? (
              // Recovery Key Presentation screen (after register)
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="h-12 w-12 rounded-full bg-[#00C805]/10 flex items-center justify-center mx-auto">
                    <ShieldCheck className="h-6 w-6 text-[#00C805]" />
                  </div>
                  <h3 className="text-lg font-bold text-white">Save Your Recovery Key</h3>
                  <p className="text-xs text-[#8C8C8C] leading-relaxed">
                    ROSA uses non-custodial smart accounts. This key is the only way to recover your wallet if you forget your password.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#303030] space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold text-[#00C805]">Secret Recovery Key</span>
                    <button
                      onClick={handleCopyKey}
                      className="text-[10px] text-[#8C8C8C] hover:text-[#8C8C8C] font-semibold flex items-center space-x-1 active:scale-95 transition-transform duration-100"
                    >
                      {copiedKey ? (
                        <>
                          <Check className="h-3 w-3" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3 w-3" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-3 bg-[#000000] rounded-xl border border-[#303030] font-mono text-xs text-center text-white break-all select-all select-none selection:bg-violet-600/30">
                    {generatedRecoveryKey}
                  </div>
                </div>

                <div className="flex items-start space-x-2.5">
                  <input
                    type="checkbox"
                    id="confirm-save"
                    checked={hasConfirmedSave}
                    onChange={(e) => setHasConfirmedSave(e.target.checked)}
                    className="mt-0.5 h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-[#303030] bg-[#000000] rounded cursor-pointer"
                  />
                  <label htmlFor="confirm-save" className="text-xs text-[#8C8C8C] select-none cursor-pointer">
                    I have saved my secret recovery key and understand that it cannot be recovered if lost.
                  </label>
                </div>

                <button
                  onClick={proceedToDashboard}
                  disabled={!hasConfirmedSave}
                  className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
                >
                  Proceed to Dashboard
                </button>
              </div>
            ) : (
              // Standard auth form (Sign In, Register, Recover tabs)
              <div className="space-y-6">
                <div className="flex border-b border-[#303030] pb-1">
                  {(["signin", "register", "recover"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab);
                        setEmail("");
                        setPassword("");
                        setRecoveryKey("");
                      }}
                      className={`flex-1 pb-3 text-xs font-bold uppercase tracking-wider transition ${
                        activeTab === tab
                          ? "text-[#00C805] border-b-2 border-emerald-400"
                          : "text-[#8C8C8C] hover:text-[#8C8C8C]"
                      }`}
                    >
                      {tab === "signin" ? "Sign In" : tab === "register" ? "Register" : "Recover"}
                    </button>
                  ))}
                </div>

                {activeTab === "signin" && (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00C805]/50 glow-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00C805]/50 glow-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-[#030712]/20 border-t-[#030712] rounded-full animate-spin" />
                      ) : (
                        "Sign In"
                      )}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab("recover")}
                        className="text-xs text-[#00C805] hover:underline"
                      >
                        Forgot password? Sign in with Recovery Key
                      </button>
                    </div>
                  </form>
                )}

                {activeTab === "register" && (
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00C805]/50 glow-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00C805]/50 glow-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-[#030712]/20 border-t-[#030712] rounded-full animate-spin" />
                      ) : (
                        "Register & Create Wallet"
                      )}
                    </button>
                  </form>
                )}

                {activeTab === "recover" && (
                  <form onSubmit={handleRecover} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="email"
                          required
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00C805]/50 glow-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Secret Recovery Key</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="text"
                          required
                          placeholder="ROSA-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX-XXXX"
                          value={recoveryKey}
                          onChange={(e) => setRecoveryKey(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#00C805]/50 font-mono glow-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block">Set New Password for this device</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C8C8C]" />
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="w-full h-11 pl-11 pr-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#00C805]/50 glow-input"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
                    >
                      {isLoading ? (
                        <div className="h-4 w-4 border-2 border-[#030712]/20 border-t-[#030712] rounded-full animate-spin" />
                      ) : (
                        "Recover & Sign In"
                      )}
                    </button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab("signin")}
                        className="text-xs text-[#00C805] hover:underline"
                      >
                        Back to Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
