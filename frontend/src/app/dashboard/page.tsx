"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  TrendingUp, 
  ShieldCheck, 
  Zap, 
  Wallet,
  Plus,
  Key,
  Play,
  RotateCw,
  LogOut,
  Calendar,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  DollarSign,
  Copy,
  Check
} from "lucide-react";
import Link from "next/link";
import { 
  ROSA_ABI, 
  ERC20_ABI, 
  getNetworkConfig,
  getPublicClient,
  fetchOnChainCircles, 
  OnChainCircle 
} from "../../lib/rosa";
import { createWalletClient, http, parseUnits, formatUnits, Address } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export default function Dashboard() {
  // Network and Wallet state
  const [selectedChainId, setSelectedChainId] = useState<number>(46630); // Default to Robinhood Chain Testnet
  const [privateKey, setPrivateKey] = useState<string>("");
  const [userAddress, setUserAddress] = useState<string>("");
  const [ethBalance, setEthBalance] = useState<string>("0.00");
  const [tokenBalance, setTokenBalance] = useState<string>("0.00");

  // On-chain circles state
  const [circles, setCircles] = useState<OnChainCircle[]>([]);
  const [selectedCircleId, setSelectedCircleId] = useState<string>("");
  const [loadingCircles, setLoadingCircles] = useState<boolean>(true);

  // Form states
  const [newCircleName, setNewCircleName] = useState("");
  const [newContribution, setNewContribution] = useState(10);
  const [newPeriod, setNewPeriod] = useState("60"); // default 1 Min for demo
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [customInviteCode, setCustomInviteCode] = useState(""); // custom invite code prefix
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Withdraw states
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // UI state
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);

  // Get active network config
  const network = getNetworkConfig(selectedChainId);
  const activeCircle = circles.find(c => c.id === selectedCircleId) || circles[0];

  const logSim = (msg: string) => {
    setSimulationLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 15));
  };

  const handleCopyAddress = () => {
    if (!userAddress) return;
    navigator.clipboard.writeText(userAddress);
    setCopiedAddress(true);
    setTimeout(() => setCopiedAddress(false), 2000);
  };

  // Initialize client-side wallet
  useEffect(() => {
    if (typeof window === "undefined") return;

    let storedKey = localStorage.getItem("rosa_demo_key");
    if (!storedKey) {
      // Generate standard random 32-byte private key
      const randBytes = new Uint8Array(32);
      window.crypto.getRandomValues(randBytes);
      storedKey = "0x" + Array.from(randBytes).map(b => b.toString(16).padStart(2, "0")).join("");
      localStorage.setItem("rosa_demo_key", storedKey);
    }
    
    setPrivateKey(storedKey);
    const account = privateKeyToAccount(storedKey as Address);
    setUserAddress(account.address);
    const emailVal = localStorage.getItem("rosa_user_email");
    if (emailVal) {
      setUserEmail(emailVal);
    }
    logSim(`Smart account loaded: ${account.address}`);
  }, []);

  // Sync default form token address when chain changes
  useEffect(() => {
    setCustomTokenAddress(network.tokenAddress);
    setWithdrawTokenAddress(network.tokenAddress);
  }, [selectedChainId]);

  // Fetch balances and circles
  const refreshOnChainData = async () => {
    if (!userAddress) return;
    setLoadingCircles(true);
    try {
      const client = getPublicClient(selectedChainId);

      // Fetch native ETH gas balance
      const ethVal = await client.getBalance({ address: userAddress as Address });
      setEthBalance(parseFloat(formatUnits(ethVal, 18)).toFixed(4));

      // Fetch stablecoin token balance (USDG / USDC)
      try {
        const tokenVal = await client.readContract({
          address: network.tokenAddress,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [userAddress as Address],
        });
        setTokenBalance(parseFloat(formatUnits(tokenVal, 6)).toFixed(2));
      } catch (tokenErr) {
        console.error("Token balance fetch error:", tokenErr);
        setTokenBalance("0.00");
      }

      // Fetch ROSA circles for this chain
      const onChainCircles = await fetchOnChainCircles(selectedChainId, userAddress);
      setCircles(onChainCircles);
      
      // Auto-select first circle if none selected
      if (onChainCircles.length > 0) {
        setSelectedCircleId(onChainCircles[0].id);
      } else {
        setSelectedCircleId("");
      }
    } catch (err: any) {
      console.error("Failed to load on-chain data:", err);
      logSim(`Error refreshing blockchain data: ${err.message}`);
    } finally {
      setLoadingCircles(false);
    }
  };

  useEffect(() => {
    if (userAddress) {
      refreshOnChainData();
    }
  }, [userAddress, selectedChainId]);

  // 1. Join circle via invite code (e.g. ROSA-1 or MY-CIRCLE-5)
  const handleJoinCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim() || !userAddress) return;

    setIsJoining(true);
    const code = joinInviteCode.trim().toUpperCase();
    logSim(`Attempting to join circle with code: ${code}...`);

    const codeParts = code.split("-");
    const circleIdStr = codeParts[codeParts.length - 1];
    const circleIdNum = Number(circleIdStr);

    if (isNaN(circleIdNum) || circleIdNum <= 0) {
      logSim("Invalid invite code. Must end with the Circle ID (e.g. ROSA-1 or LONDON-DEVS-5)");
      setIsJoining(false);
      return;
    }

    const circleIdVal = BigInt(circleIdNum);

    try {
      const client = getPublicClient(selectedChainId);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account,
        chain: network.chain,
        transport: http(),
      });

      // 1. Fetch circle details to get contribution amount and token address
      const details = await client.readContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "getCircleDetails",
        args: [circleIdVal],
      });

      const tokenAddress = details[0];
      const contributionAmount = details[1];

      // 2. Approve stablecoin spend to ROSA Pool contract
      logSim(`Step 1/2: Submitting spend approval transaction...`);
      const approveHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [network.poolAddress, contributionAmount],
      });
      logSim(`Approval TX sent: ${approveHash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash: approveHash });

      // 3. Call joinCircle
      logSim("Step 2/2: Submitting join circle transaction to Stylus contract...");
      const joinHash = await walletClient.writeContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "joinCircle",
        args: [circleIdVal],
      });
      logSim(`Join TX sent: ${joinHash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash: joinHash });

      logSim(`Successfully joined Circle #${circleIdVal.toString()}!`);

      // Save prefix to localStorage
      if (codeParts.length > 1) {
        const prefix = codeParts.slice(0, -1).join("-");
        const inviteCodeMap = JSON.parse(localStorage.getItem("rosa_circle_invite_codes") || "{}");
        inviteCodeMap[`${selectedChainId}_${circleIdVal.toString()}`] = prefix;
        localStorage.setItem("rosa_circle_invite_codes", JSON.stringify(inviteCodeMap));
      }

      setJoinInviteCode("");
      await refreshOnChainData();
      setSelectedCircleId(circleIdVal.toString());
    } catch (err: any) {
      logSim(`Failed to join circle: ${err.message}`);
      console.error(err);
    } finally {
      setIsJoining(false);
    }
  };

  // 2. Create new circle
  const handleCreateCircle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim() || !userAddress) return;

    setIsCreating(true);
    logSim(`Deploying new ROSA Circle: ${newCircleName}...`);

    try {
      const client = getPublicClient(selectedChainId);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account,
        chain: network.chain,
        transport: http(),
      });

      const contributionDecimals = parseUnits(newContribution.toString(), 6); // standard 6 decimals for USDC/USDG
      const periodSeconds = BigInt(newPeriod);
      const tokenToUse = (customTokenAddress.trim() || network.tokenAddress) as Address;

      // Call createCircle
      logSim("Submitting createCircle transaction to Stylus contract...");
      const createHash = await walletClient.writeContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "createCircle",
        args: [tokenToUse, contributionDecimals, periodSeconds],
      });
      logSim(`Create Circle TX sent: ${createHash.slice(0, 10)}... waiting confirmation`);
      
      await client.waitForTransactionReceipt({ hash: createHash });
      logSim("Stylus contract processed Circle creation!");

      // Fetch new circle ID
      const nextIdBig = await client.readContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "getCircleCount",
      });
      const newCircleId = Number(nextIdBig);

      // Save custom invite code mapping to localStorage
      const prefix = customInviteCode.trim() || "ROSA";
      const inviteCodeMap = JSON.parse(localStorage.getItem("rosa_circle_invite_codes") || "{}");
      inviteCodeMap[`${selectedChainId}_${newCircleId}`] = prefix;
      localStorage.setItem("rosa_circle_invite_codes", JSON.stringify(inviteCodeMap));

      logSim(`Circle #${newCircleId} created with invite code: ${prefix}-${newCircleId}`);
      setNewCircleName("");
      setCustomInviteCode("");
      await refreshOnChainData();
    } catch (err: any) {
      logSim(`Failed to create circle: ${err.message}`);
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // 3. Withdraw/Transfer Tokens
  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawRecipient.trim() || !userAddress || !privateKey) return;

    setIsWithdrawing(true);
    logSim(`Initiating token withdrawal to ${withdrawRecipient}...`);

    try {
      const client = getPublicClient(selectedChainId);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account,
        chain: network.chain,
        transport: http(),
      });

      const tokenToWithdraw = (withdrawTokenAddress.trim() || network.tokenAddress) as Address;
      const decimals = 6; // Assume 6 decimals for USDG / USDC (default)
      const amountUnits = parseUnits(withdrawAmount.toString(), decimals);

      logSim(`Submitting ERC-20 transfer of ${withdrawAmount} tokens to ${withdrawRecipient}...`);
      
      const transferHash = await walletClient.writeContract({
        address: tokenToWithdraw,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [withdrawRecipient as Address, amountUnits],
      });

      logSim(`Transfer TX sent: ${transferHash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash: transferHash });
      logSim(`Withdrawal successful! Transferred ${withdrawAmount} tokens.`);

      setWithdrawRecipient("");
      await refreshOnChainData();
    } catch (err: any) {
      logSim(`Withdrawal failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // 3. Simulate Periodic Rotation (Trigger Rotation)
  const handleTriggerRotation = async () => {
    if (!activeCircle || !userAddress) return;

    setIsRotating(true);
    logSim(`Triggering rotation check for Circle #${activeCircle.id}...`);

    try {
      const client = getPublicClient(selectedChainId);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account,
        chain: network.chain,
        transport: http(),
      });

      const circleIdVal = BigInt(activeCircle.id);

      logSim("Submitting triggerRotation transaction to Stylus contract...");
      const rotHash = await walletClient.writeContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "triggerRotation",
        args: [circleIdVal],
      });
      logSim(`Rotation TX sent: ${rotHash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash: rotHash });

      logSim(`On-chain rotation succeeded! Pot disbursed to the next recipient.`);
      await refreshOnChainData();
    } catch (err: any) {
      logSim(`Rotation failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsRotating(false);
    }
  };

  const totalLocked = circles.reduce((sum, c) => sum + c.totalPot, 0);
  const totalYield = circles.reduce((sum, c) => sum + c.yieldEarned, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#090D16] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-violet-600/5 blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-white/5 bg-[#090D16]/50 backdrop-blur-md z-10">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-violet-600 to-emerald-400 p-[1px]">
              <div className="h-full w-full bg-[#090D16] rounded-[7px] flex items-center justify-center">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              ROSA Dashboard
            </span>
          </div>

          <div className="flex items-center space-x-4">
            {/* Network Selector */}
            <select
              value={selectedChainId}
              onChange={(e) => {
                setSelectedChainId(Number(e.target.value));
                setCircles([]);
                setSelectedCircleId("");
              }}
              className="h-9 px-3 rounded-xl bg-[#111827]/80 border border-white/10 text-xs font-semibold text-slate-200 focus:outline-none focus:border-violet-500/50"
            >
              <option value={46630}>Robinhood Chain Testnet</option>
              <option value={421614}>Arbitrum Sepolia</option>
            </select>

            {userEmail && (
              <span className="hidden md:inline-block text-xs font-semibold text-violet-400 border border-violet-500/20 px-3 py-1.5 rounded-xl bg-violet-500/5">
                {userEmail}
              </span>
            )}
            <button
              onClick={handleCopyAddress}
              className="hidden sm:flex items-center space-x-2 border border-white/5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 hover:border-white/10 transition cursor-pointer text-left focus:outline-none"
              title="Copy Smart Wallet Address"
            >
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-mono text-slate-300">
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "Loading..."}
              </span>
              {copiedAddress ? (
                <Check className="h-3.5 w-3.5 text-emerald-400 shrink-0 ml-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-500 shrink-0 ml-1" />
              )}
            </button>
            <button
              onClick={refreshOnChainData}
              disabled={loadingCircles}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
              title="Refresh blockchain data"
            >
              <RefreshCw className={`h-4 w-4 ${loadingCircles ? "animate-spin" : ""}`} />
            </button>
            <Link 
              href="/"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Faucet & Balance Strip */}
      <div className="border-b border-white/5 bg-[#0e1422]/60 z-10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">Gas Balance:</span>
              <span className="text-white font-mono font-semibold">{ethBalance} ETH</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-slate-400">{network.tokenSymbol} Balance:</span>
              <span className="text-emerald-400 font-mono font-semibold">{tokenBalance} {network.tokenSymbol}</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {selectedChainId === 46630 ? (
              <>
                <a
                  href="https://faucet.testnet.chain.robinhood.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition"
                  title="Official Robinhood Faucet (ETH + Stock Tokens)"
                >
                  Robinhood Faucet
                </a>
                <a
                  href="https://www.paxos.com/testnet-faucet/"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition"
                  title="Paxos USDG Faucet (100 USDG per request)"
                >
                  Paxos USDG Faucet
                </a>
              </>
            ) : (
              <a
                href="https://faucet.circle.com"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold transition"
                title="Circle USDC Faucet"
              >
                Circle USDC Faucet
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full grid lg:grid-cols-12 gap-8 z-10 overflow-y-auto">
        
        {/* Left Column - Stats & Circles List (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Metrics summary */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Active Savings Capital</span>
              <span className="text-2xl font-bold text-white">{totalLocked} {network.tokenSymbol}</span>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Total Yield Generated</span>
              <span className="text-2xl font-bold text-emerald-400 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                +{totalYield.toFixed(2)} {network.tokenSymbol}
              </span>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Active Savings Circles</span>
              <span className="text-2xl font-bold text-white">{circles.length}</span>
            </div>
          </div>

          {/* Active Circles Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center">
              <RotateCw className="h-4 w-4 mr-2 text-violet-400" />
              <span>Your Savings Circles</span>
            </h2>
            {loadingCircles && circles.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-white/5 rounded-2xl bg-[#111827]/10">
                <div className="h-8 w-8 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin mb-4" />
                <span className="text-sm text-slate-400">Querying smart contract state on {network.chain.name}...</span>
              </div>
            ) : circles.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-2xl bg-[#111827]/10 text-center">
                <span className="text-sm text-slate-400 block mb-3">No active savings circles found on this network.</span>
                <span className="text-xs text-slate-500">Deploy a new circle or join one using an invite code.</span>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {circles.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCircleId(c.id)}
                    className={`p-6 rounded-2xl border text-left transition duration-200 ${
                      c.id === selectedCircleId 
                        ? "bg-violet-600/10 border-violet-500/30 shadow-lg shadow-violet-600/5" 
                        : "bg-white/5 border-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-white">Circle #{c.id}</h3>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded border border-violet-400/20">
                        {c.period}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Contribution</span>
                        <span className="text-slate-200 font-semibold">{c.contribution} {c.tokenSymbol}</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Members</span>
                        <span className="text-slate-200 font-semibold">{c.members.length} active</span>
                      </div>
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Total Pot</span>
                        <span className="text-emerald-400 font-semibold">{c.totalPot} {c.tokenSymbol}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Detailed View of Selected Circle */}
          {activeCircle && (
            <div className="p-6 rounded-3xl bg-[#111827]/30 border border-white/5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <span className="text-xs text-slate-400 block uppercase tracking-wider">Active Circle Focus</span>
                  <h2 className="text-xl font-bold text-white">Circle #{activeCircle.id} details</h2>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Invite Code</span>
                    <span className="text-sm font-mono font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2.5 py-1 rounded-lg">
                      {activeCircle.inviteCode}
                    </span>
                  </div>
                  <button
                    onClick={handleTriggerRotation}
                    disabled={isRotating || activeCircle.members.length === 0}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 disabled:from-emerald-500/30 disabled:to-teal-500/30 disabled:text-slate-500 text-[#090D16] font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-500/10 transition"
                  >
                    {isRotating ? (
                      <div className="h-3 w-3 border-2 border-[#090D16]/20 border-t-[#090D16] rounded-full animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 fill-[#090D16]" />
                    )}
                    <span>Trigger Rotation</span>
                  </button>
                </div>
              </div>

              {/* Circle Details Table */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Circle Members & Rotation Status</h3>
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#090D16]/40">
                  <div className="grid grid-cols-12 gap-4 bg-white/5 px-6 py-3 text-xs text-slate-400 font-medium">
                    <div className="col-span-5">Member Name</div>
                    <div className="col-span-4">Smart Account / Wallet</div>
                    <div className="col-span-3 text-right">Pot Received</div>
                  </div>
                  
                  <div className="divide-y divide-white/5">
                    {activeCircle.members.map((m, idx) => (
                      <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm items-center">
                        <div className="col-span-5 font-semibold text-white flex items-center space-x-2">
                          <span>
                            {m.isCurrentUser ? "You" : `Member #${idx + 1}`}
                          </span>
                          {m.isCurrentUser && (
                            <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.2 rounded-full">
                              Smart Wallet
                            </span>
                          )}
                        </div>
                        <div className="col-span-4 font-mono text-xs text-slate-400">
                          {m.address.slice(0, 8)}...{m.address.slice(-6)}
                        </div>
                        <div className="col-span-3 text-right">
                          {m.hasReceived ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                              <CheckCircle className="h-3.5 w-3.5" />
                              <span>Paid Out</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/5 text-slate-400 border border-white/5">
                              <span>Pending</span>
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Forms & Simulation Console (4 cols) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* Join Circle */}
          <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/5 space-y-4">
            <h3 className="font-bold text-white flex items-center">
              <Key className="h-4 w-4 mr-2 text-violet-400" />
              <span>Join via Invite Code</span>
            </h3>
            <form onSubmit={handleJoinCircle} className="space-y-3">
              <input
                type="text"
                value={joinInviteCode}
                onChange={(e) => setJoinInviteCode(e.target.value)}
                placeholder="e.g., ROSA-1"
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="submit"
                disabled={isJoining || !joinInviteCode.trim()}
                className="w-full h-11 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/30 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl transition flex items-center justify-center"
              >
                {isJoining ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Join Circle"
                )}
              </button>
            </form>
          </div>

          {/* Create Circle */}
          <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/5 space-y-4">
            <h3 className="font-bold text-white flex items-center">
              <Plus className="h-4 w-4 mr-2 text-violet-400" />
              <span>Deploy New ROSA Circle</span>
            </h3>
            <form onSubmit={handleCreateCircle} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Circle Name</label>
                <input
                  type="text"
                  value={newCircleName}
                  onChange={(e) => setNewCircleName(e.target.value)}
                  placeholder="e.g., London Devs Circle"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Invite Code Prefix</label>
                <input
                  type="text"
                  value={customInviteCode}
                  onChange={(e) => setCustomInviteCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                  placeholder="e.g., LONDON-DEVS"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                />
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Suffix with circle ID is auto-appended. E.g., LONDON-DEVS-[ID]
                </span>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Stablecoin Token Address</label>
                <input
                  type="text"
                  value={customTokenAddress}
                  onChange={(e) => setCustomTokenAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500/50 font-mono"
                />
                <span className="text-[9px] text-slate-500 mt-1 block">
                  Defaults to {network.tokenName} on this network.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Contribution</label>
                  <input
                    type="number"
                    value={newContribution}
                    onChange={(e) => setNewContribution(Number(e.target.value))}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Frequency</label>
                  <select
                    value={newPeriod}
                    onChange={(e) => setNewPeriod(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl bg-[#090D16] border border-white/5 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  >
                    <option value="60">1 Min (Demo)</option>
                    <option value="300">5 Min (Demo)</option>
                    <option value="3600">Hourly</option>
                    <option value="86400">Daily</option>
                    <option value="604800">Weekly</option>
                    <option value="2592000">Monthly</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isCreating || !newCircleName.trim()}
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 disabled:from-violet-600/30 disabled:to-indigo-600/30 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-600/15 transition flex items-center justify-center"
              >
                {isCreating ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Deploy Circle"
                )}
              </button>
            </form>
          </div>

          {/* Withdraw / Transfer Tokens */}
          <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/5 space-y-4">
            <h3 className="font-bold text-white flex items-center">
              <LogOut className="h-4 w-4 mr-2 text-violet-400 rotate-180" />
              <span>Withdraw / Transfer Tokens</span>
            </h3>
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Recipient Wallet Address</label>
                <input
                  type="text"
                  value={withdrawRecipient}
                  onChange={(e) => setWithdrawRecipient(e.target.value)}
                  placeholder="0x..."
                  required
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Amount</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    required
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white text-sm focus:outline-none focus:border-violet-500/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Token Address</label>
                  <input
                    type="text"
                    value={withdrawTokenAddress}
                    onChange={(e) => setWithdrawTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-violet-500/50 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isWithdrawing || !withdrawRecipient.trim()}
                className="w-full h-11 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 disabled:from-red-600/30 disabled:to-rose-600/30 disabled:text-slate-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-red-600/15 transition flex items-center justify-center"
              >
                {isWithdrawing ? (
                  <div className="h-4 w-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  "Withdraw Tokens"
                )}
              </button>
            </form>
          </div>

          {/* Simulation / Log Console */}
          <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center">
                <RotateCw className="h-3.5 w-3.5 mr-2 text-emerald-400" />
                <span>Simulation Console</span>
              </h3>
              <button 
                onClick={() => setSimulationLog([])}
                className="text-[10px] text-slate-500 hover:text-white"
              >
                Clear
              </button>
            </div>
            
            <div className="h-40 rounded-xl bg-[#090D16] border border-white/5 p-4 overflow-y-auto font-mono text-[11px] space-y-2 text-slate-400">
              {simulationLog.length === 0 ? (
                <div className="text-slate-600 text-center py-12">No simulation events logged yet. Trigger an action to print transaction receipts.</div>
              ) : (
                simulationLog.map((log, i) => (
                  <div key={i} className="leading-relaxed border-l-2 border-violet-500/50 pl-2">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
