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
  const [newCreatorName, setNewCreatorName] = useState("");
  const [newContribution, setNewContribution] = useState(10);
  const [newPeriod, setNewPeriod] = useState("60"); // default 1 Min for demo
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [customInviteCode, setCustomInviteCode] = useState(""); // custom invite code prefix
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [joinMemberName, setJoinMemberName] = useState("");
  const [userEmail, setUserEmail] = useState<string>("");

  // Withdraw states
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState(10);
  const [withdrawTokenAddress, setWithdrawTokenAddress] = useState("");
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawChainId, setWithdrawChainId] = useState<number>(46630);

  // UI state
  const [simulationLog, setSimulationLog] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [isRotating, setIsRotating] = useState<boolean>(false);
  const [copiedAddress, setCopiedAddress] = useState<boolean>(false);
  const [requireCollateral, setRequireCollateral] = useState<boolean>(false);
  const [collateralAmount, setCollateralAmount] = useState<number>(10);
  const [isExiting, setIsExiting] = useState<boolean>(false);
  const [hoveredMember, setHoveredMember] = useState<number | null>(null);

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

  // Get active network config
  const network = getNetworkConfig(selectedChainId);
  const activeCircle = circles.find(c => c.id === selectedCircleId) || circles[0];
  const currentUserMemberInfo = activeCircle?.members.find(
    m => m.address.toLowerCase() === userAddress.toLowerCase()
  );
  const isCurrentUserMember = !!currentUserMemberInfo;
  const hasCurrentUserReceived = currentUserMemberInfo?.hasReceived || false;

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
    setWithdrawChainId(selectedChainId);
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

      // Load deployed circles from localStorage for filtering
      let deployedIds: string[] = [];
      try {
        const deployedMap = JSON.parse(localStorage.getItem("rosa_deployed_circles") || "{}");
        deployedIds = deployedMap[selectedChainId] || [];
      } catch (err) {
        console.error("Error reading deployed circles registry:", err);
      }

      const filteredCircles = onChainCircles.filter(c => {
        const isMember = c.members.some(m => m.address.toLowerCase() === userAddress.toLowerCase());
        const isDeployedByMe = deployedIds.includes(c.id);
        return isMember || isDeployedByMe;
      });

      setCircles(filteredCircles);
      
      // Auto-select first circle if none selected
      if (filteredCircles.length > 0) {
        setSelectedCircleId(filteredCircles[0].id);
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
    if (!joinInviteCode.trim() || !joinMemberName.trim() || !userAddress) return;

    setIsJoining(true);
    const code = joinInviteCode.trim().toUpperCase();
    const memberName = joinMemberName.trim();
    logSim(`Attempting to join circle with code: ${code} as member: ${memberName}...`);

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
      const reqCollateral = details[8];
      const colAmount = details[9];

      let approveAmount = contributionAmount;
      if (reqCollateral) {
        approveAmount = colAmount + contributionAmount;
      }

      // 2. Approve stablecoin spend to ROSA Pool contract
      logSim(`Step 1/2: Submitting spend approval transaction...`);
      const approveHash = await walletClient.writeContract({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [network.poolAddress, approveAmount],
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

      // Save member name to localStorage
      try {
        const namesMap = JSON.parse(localStorage.getItem("rosa_member_names") || "{}");
        namesMap[`${selectedChainId}_${circleIdNum}_${userAddress.toLowerCase()}`] = memberName;
        localStorage.setItem("rosa_member_names", JSON.stringify(namesMap));
      } catch (e) {
        console.error("Error saving member name:", e);
      }

      setJoinInviteCode("");
      setJoinMemberName("");
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
    if (!newCircleName.trim() || !newCreatorName.trim() || !userAddress) return;

    setIsCreating(true);
    logSim(`Deploying new ROSA Circle: ${newCircleName} by creator: ${newCreatorName.trim()}...`);

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
      const collateralDecimals = requireCollateral 
        ? parseUnits(collateralAmount.toString(), 6) 
        : BigInt(0);

      // Call createCircle
      logSim("Submitting createCircle transaction to Stylus contract...");
      const createHash = await walletClient.writeContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "createCircle",
        args: [tokenToUse, contributionDecimals, periodSeconds, requireCollateral, collateralDecimals],
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

      // Save creator name mapping to localStorage
      try {
        const creatorsMap = JSON.parse(localStorage.getItem("rosa_circle_creators") || "{}");
        creatorsMap[`${selectedChainId}_${newCircleId}`] = newCreatorName.trim();
        localStorage.setItem("rosa_circle_creators", JSON.stringify(creatorsMap));
      } catch (e) {
        console.error("Error saving creator name:", e);
      }

      // Save deployed circle ID to localStorage for filtering
      const deployedMap = JSON.parse(localStorage.getItem("rosa_deployed_circles") || "{}");
      if (!deployedMap[selectedChainId]) {
        deployedMap[selectedChainId] = [];
      }
      deployedMap[selectedChainId].push(newCircleId.toString());
      localStorage.setItem("rosa_deployed_circles", JSON.stringify(deployedMap));

      logSim(`Circle #${newCircleId} created with invite code: ${prefix}-${newCircleId}`);
      setNewCircleName("");
      setNewCreatorName("");
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
    const withdrawNetwork = getNetworkConfig(withdrawChainId);
    logSim(`Initiating token withdrawal on ${withdrawNetwork.chain.name} to ${withdrawRecipient}...`);

    try {
      const client = getPublicClient(withdrawChainId);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account,
        chain: withdrawNetwork.chain,
        transport: http(),
      });

      const tokenToWithdraw = (withdrawTokenAddress.trim() || withdrawNetwork.tokenAddress) as Address;
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
      setShowWithdrawModal(false);
      await refreshOnChainData();
    } catch (err: any) {
      logSim(`Withdrawal failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // 3. Exit Circle and reclaim collateral
  const handleExitCircle = async () => {
    if (!activeCircle || !userAddress || !privateKey) return;

    setIsExiting(true);
    logSim(`Exiting Circle #${activeCircle.id} and claiming collateral refund...`);

    try {
      const client = getPublicClient(selectedChainId);
      const account = privateKeyToAccount(privateKey as Address);
      const walletClient = createWalletClient({
        account,
        chain: network.chain,
        transport: http(),
      });

      const circleIdVal = BigInt(activeCircle.id);

      logSim("Submitting exitCircle transaction to Stylus contract...");
      const exitHash = await walletClient.writeContract({
        address: network.poolAddress,
        abi: ROSA_ABI,
        functionName: "exitCircle",
        args: [circleIdVal],
      });
      logSim(`Exit Circle TX sent: ${exitHash.slice(0, 10)}... waiting confirmation`);
      await client.waitForTransactionReceipt({ hash: exitHash });

      logSim(`Successfully exited Circle #${activeCircle.id} and refunded collateral!`);
      await refreshOnChainData();
    } catch (err: any) {
      logSim(`Exit Circle failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsExiting(false);
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
    <div className="flex-1 flex flex-col bg-[#000000] relative">
      {/* Header */}
      <header className={`sticky top-0 border-b border-[#303030] bg-[#000000] z-50 transition-all duration-500 ease-in-out ${
        showHeader ? "translate-y-0 opacity-100" : "-translate-y-full opacity-0 pointer-events-none"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-0 sm:h-20 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg overflow-hidden border border-[#303030]">
                <img src="/logo.jpg" alt="ROSA Logo" className="h-full w-full object-cover" />
              </div>
              <span className="text-lg font-bold tracking-tight text-white">
                ROSA Dashboard
              </span>
            </div>
            {/* Quick Actions (Mobile) */}
            <div className="flex items-center space-x-1 sm:hidden">
              <button
                onClick={refreshOnChainData}
                disabled={loadingCircles}
                className="p-2 text-[#8C8C8C] hover:text-white rounded-lg hover:bg-[#0A0A0A] transition active:scale-95 transition-transform duration-100"
                title="Refresh blockchain data"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCircles ? "animate-spin" : ""}`} />
              </button>
              <Link 
                href="/"
                className="p-2 text-[#8C8C8C] hover:text-white rounded-lg hover:bg-[#0A0A0A] transition active:scale-95 transition-transform duration-100"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-3 w-full sm:w-auto">
            {/* Network Selector */}
            <select
              value={selectedChainId}
              onChange={(e) => {
                setSelectedChainId(Number(e.target.value));
                setCircles([]);
                setSelectedCircleId("");
              }}
              className="h-9 px-3 rounded-xl bg-transparent border border-[#303030] hover:border-[#78D197]/40 text-xs font-semibold text-white focus:outline-none w-full sm:w-auto transition active:scale-95 transition-transform duration-100"
            >
              <option value={46630} className="bg-[#000000] text-white">Robinhood Chain Testnet</option>
              <option value={421614} className="bg-[#000000] text-white">Arbitrum Sepolia</option>
            </select>

            {userEmail && (
              <span className="hidden md:inline-block text-xs font-semibold text-slate-300 px-3 py-1.5 rounded-xl bg-transparent border border-[#303030]">
                {userEmail}
              </span>
            )}
            
            <button
              onClick={handleCopyAddress}
              className="flex items-center space-x-2 border border-[#303030] hover:border-[#78D197]/40 px-3 py-1.5 rounded-xl bg-transparent transition cursor-pointer text-left focus:outline-none active:scale-95 transition-transform duration-100 text-xs font-mono text-slate-300 w-auto"
              title="Copy Smart Wallet Address"
            >
              <Wallet className="h-4 w-4 text-slate-400" />
              <span>
                {userAddress ? `${userAddress.slice(0, 6)}...${userAddress.slice(-4)}` : "Loading..."}
              </span>
              {copiedAddress ? (
                <Check className="h-3.5 w-3.5 text-[#78D197] shrink-0 ml-1" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400 shrink-0 ml-1" />
              )}
            </button>
            
            <button
              onClick={() => {
                setWithdrawChainId(selectedChainId);
                const conf = getNetworkConfig(selectedChainId);
                setWithdrawTokenAddress(conf.tokenAddress);
                setShowWithdrawModal(true);
              }}
              className="flex items-center space-x-1.5 border border-[#00C805] px-3 py-1.5 rounded-xl bg-[#00C805] hover:bg-[#00b004] transition cursor-pointer text-xs font-extrabold text-[#000000] focus:outline-none w-auto active:scale-95 transition-transform duration-100"
              title="Withdraw Tokens"
            >
              <LogOut className="h-3.5 w-3.5 rotate-180 text-[#000000]" />
              <span>Withdraw</span>
            </button>

            {/* Quick Actions (Desktop) */}
            <div className="hidden sm:flex items-center space-x-1">
              <button
                onClick={refreshOnChainData}
                disabled={loadingCircles}
                className="p-2 text-[#8C8C8C] hover:text-white rounded-lg hover:bg-[#0A0A0A] transition active:scale-95 transition-transform duration-100"
                title="Refresh blockchain data"
              >
                <RefreshCw className={`h-4 w-4 ${loadingCircles ? "animate-spin" : ""}`} />
              </button>
              <Link 
                href="/"
                className="p-2 text-[#8C8C8C] hover:text-white rounded-lg hover:bg-[#0A0A0A] transition active:scale-95 transition-transform duration-100"
              >
                <LogOut className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Faucet & Balance Strip */}
      <div className="border-b border-[#303030] bg-[#000000]/60 z-10 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <div className="flex items-center space-x-2">
              <span className="text-[#8C8C8C]">Gas Balance:</span>
              <span className="text-white font-mono font-semibold">{ethBalance} ETH</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-[#8C8C8C]">{network.tokenSymbol} Balance:</span>
              <span className="text-[#00C805] font-mono font-semibold">{tokenBalance} {network.tokenSymbol}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {selectedChainId === 46630 ? (
              <>
                <a
                  href="https://faucet.testnet.chain.robinhood.com"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-transparent text-[#78D197] border border-[#303030] hover:border-[#78D197]/40 rounded-xl text-xs font-semibold transition active:scale-95 transition-transform duration-100"
                  title="Official Robinhood Faucet (ETH + Stock Tokens)"
                >
                  Robinhood Faucet
                </a>
                <a
                  href="https://faucet.paxos.com/?network=robinhood"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-transparent text-[#78D197] border border-[#303030] hover:border-[#78D197]/40 rounded-xl text-xs font-semibold transition active:scale-95 transition-transform duration-100"
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
                className="px-3 py-1.5 bg-transparent text-[#78D197] border border-[#303030] hover:border-[#78D197]/40 rounded-xl text-xs font-semibold transition active:scale-95 transition-transform duration-100"
                title="Circle USDC Faucet"
              >
                Circle USDC Faucet
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Dashboard */}
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full space-y-8 z-10">
          
          {/* Metrics summary */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#303030]">
              <span className="text-xs text-[#8C8C8C] block mb-1">Active Savings Capital</span>
              <span className="text-2xl font-bold text-white">{totalLocked} {network.tokenSymbol}</span>
            </div>
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#303030]">
              <span className="text-xs text-[#8C8C8C] block mb-1">Total Yield Generated</span>
              <span className="text-2xl font-bold text-[#00C805] flex items-center">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                +{totalYield.toFixed(2)} {network.tokenSymbol}
              </span>
            </div>
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#303030]">
              <span className="text-xs text-[#8C8C8C] block mb-1">Active Savings Circles</span>
              <span className="text-2xl font-bold text-white">{circles.length}</span>
            </div>
          </div>


          {/* Active Circles Selector */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center">
              <RotateCw className="h-4 w-4 mr-2 text-[#78D197]" />
              <span>Your Savings Circles</span>
            </h2>
            {loadingCircles && circles.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-[#303030] rounded-2xl bg-[#0A0A0A]/10">
                <div className="h-8 w-8 border-2 border-[#78D197]/25 border-t-violet-500 rounded-full animate-spin mb-4" />
                <span className="text-sm text-[#8C8C8C]">Querying smart contract state on {network.chain.name}...</span>
              </div>
            ) : circles.length === 0 ? (
              <div className="p-8 border border-dashed border-[#303030] rounded-2xl bg-[#0A0A0A]/10 text-center">
                <span className="text-sm text-[#8C8C8C] block mb-3">No active savings circles found on this network.</span>
                <span className="text-xs text-[#8C8C8C]">Deploy a new circle or join one using an invite code.</span>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {circles.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCircleId(c.id)}
                    className={`p-6 rounded-2xl border text-left transition duration-200 ${
                      c.id === selectedCircleId 
                        ? "bg-transparent border-[#78D197]" 
                        : "bg-[#0A0A0A] border-[#303030] hover:border-[#303030]"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-bold text-white">Circle #{c.id}</h3>
                      <span className="text-[10px] uppercase font-semibold tracking-wider text-[#78D197] bg-transparent px-2 py-0.5 rounded border border-[#78D197]/40">
                        {c.period}
                      </span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-[#8C8C8C]">
                        <span>Contribution</span>
                        <span className="text-slate-200 font-semibold">{c.contribution} {c.tokenSymbol}</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#8C8C8C]">
                        <span>Members</span>
                        <span className="text-slate-200 font-semibold">{c.members.length} active</span>
                      </div>
                      <div className="flex justify-between text-xs text-[#8C8C8C]">
                        <span>Total Pot</span>
                        <span className="text-[#78D197] font-semibold">{c.totalPot} {c.tokenSymbol}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>


          {/* Detailed View of Selected Circle */}
          {activeCircle && (
            <div className="p-6 rounded-3xl space-y-6 glass-panel">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="space-y-1">
                  <span className="text-xs text-[#8C8C8C] block uppercase tracking-wider">Active Circle Focus</span>
                  <div className="flex items-center space-x-3 flex-wrap gap-y-1.5">
                    <h2 className="text-xl font-bold text-white">Circle #{activeCircle.id}</h2>
                    {activeCircle.creatorName && (
                      <span className="text-[10px] text-[#8C8C8C] font-semibold bg-[#0A0A0A] border border-[#303030] px-2 py-0.5 rounded-full">
                        Creator: {activeCircle.creatorName}
                      </span>
                    )}
                    {activeCircle.requireCollateral ? (
                      <span className="text-[10px] text-[#78D197] font-semibold bg-transparent border border-[#78D197]/40 px-2 py-0.5 rounded-full">
                        Collateral Backed: {activeCircle.collateralAmount} {activeCircle.tokenSymbol}
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#8C8C8C] font-semibold bg-[#0A0A0A] border border-[#303030] px-2 py-0.5 rounded-full">
                        Zero Collateral Circle
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-[10px] text-[#8C8C8C] block font-semibold">Invite Code</span>
                    <span className="text-sm font-mono font-bold text-[#78D197] bg-transparent border border-[#78D197]/40 px-2.5 py-1 rounded-lg">
                      {activeCircle.inviteCode}
                    </span>
                  </div>
                  {isCurrentUserMember && !hasCurrentUserReceived && (
                    <button
                      onClick={handleExitCircle}
                      disabled={isExiting}
                      className="px-4 py-2 border border-red-500/30 bg-red-500/5 hover:bg-red-500/10 text-red-400 font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer active:scale-95 transition-transform duration-100"
                    >
                      {isExiting ? (
                        <div className="h-3 w-3 border-2 border-red-400/20 border-t-red-400 rounded-full animate-spin" />
                      ) : null}
                      <span>Exit Circle</span>
                    </button>
                  )}
                  <button
                    onClick={handleTriggerRotation}
                    disabled={isRotating || activeCircle.members.length === 0}
                    className="px-4 py-2 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-bold text-xs rounded-xl flex items-center space-x-1.5 transition cursor-pointer active:scale-95 transition-transform duration-100"
                  >
                    {isRotating ? (
                      <div className="h-3 w-3 border-2 border-[#303030]/20 border-t-black rounded-full animate-spin" />
                    ) : (
                      <Play className="h-3 w-3 fill-[#000000]" />
                    )}
                    <span>Trigger Rotation</span>
                  </button>
                </div>
              </div>

              {/* Split layout: Payout Map and Table */}
              <div className="grid md:grid-cols-12 gap-6 items-stretch">
                
                {/* Left: Circular Visual Payout Map (5 cols) */}
                <div className="md:col-span-5 p-6 rounded-2xl bg-[#000000]/60 border border-[#303030] flex flex-col items-center justify-center min-h-[320px] relative overflow-hidden glass-panel">
                  <h4 className="text-xs font-bold text-[#8C8C8C] uppercase tracking-wider absolute top-4 left-4">
                    Payout Rotation Map
                  </h4>
                  
                  {activeCircle.members.length === 0 ? (
                    <span className="text-xs text-[#8C8C8C]">No members in this circle yet.</span>
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center pt-6">
                      <div className="relative w-44 h-44">
                        <svg viewBox="0 0 220 220" className="w-full h-full">
                          {/* Inner Dashed Ring */}
                          <circle cx="110" cy="110" r="70" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" strokeDasharray="4 4" />
                          
                          {/* Center Round Indicator */}
                          <circle cx="110" cy="110" r="34" fill="#000000" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1" />
                          <text x="110" y="104" textAnchor="middle" fill="rgba(255, 255, 255, 0.4)" fontSize="8" fontWeight="bold" className="uppercase tracking-wider">Round</text>
                          <text x="110" y="121" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="bold">{activeCircle.round}</text>
                          
                          {/* Member Nodes */}
                          {activeCircle.members.map((m, idx) => {
                            const total = activeCircle.members.length;
                            const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                            const x = 110 + 70 * Math.cos(angle);
                            const y = 110 + 70 * Math.sin(angle);
                            const isActive = idx === activeCircle.activePayoutIndex;
                            const isPaid = m.hasReceived;
                            
                            let strokeColor = "rgba(255, 255, 255, 0.2)";
                            let fill = "rgba(17, 24, 39, 0.8)";
                            let radius = isActive ? 18 : 14;
                            let pulse = false;

                            if (isActive) {
                              strokeColor = "#78D197";
                              fill = "transparent";
                              pulse = true;
                            } else if (isPaid) {
                              strokeColor = "#78D197";
                              fill = "transparent";
                            }

                            return (
                              <g 
                                key={idx} 
                                className="cursor-pointer transition-all duration-200"
                                onMouseEnter={() => setHoveredMember(idx)}
                                onMouseLeave={() => setHoveredMember(null)}
                              >
                                {pulse && (
                                  <circle cx={x} cy={y} r={radius + 5} fill="none" stroke="#78D197" strokeWidth="1" className="animate-ping" opacity="0.3" />
                                )}
                                <circle 
                                  cx={x} 
                                  cy={y} 
                                  r={radius} 
                                  fill={fill} 
                                  stroke={strokeColor} 
                                  strokeWidth={isActive ? 2 : 1.5} 
                                />
                                <text 
                                  x={x} 
                                  y={y} 
                                  textAnchor="middle" 
                                  dy=".3em" 
                                  fill={isActive ? "#78D197" : "#8C8C8C"} 
                                  fontSize={isActive ? 8 : 7} 
                                  fontWeight={isActive ? "bold" : "normal"}
                                >
                                  {m.name ? (m.name.length > 5 ? `${m.name.slice(0, 4)}.` : m.name) : (m.isCurrentUser ? "You" : `#${idx + 1}`)}
                                </text>
                              </g>
                            );
                          })}
                        </svg>
                      </div>
                      
                      {/* Hover / Active Member details overlay info */}
                      <div className="mt-4 w-full h-12 flex flex-col items-center justify-center text-center">
                        {hoveredMember !== null ? (
                          <>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C8C8C]">
                              {activeCircle.members[hoveredMember].name 
                                ? `${activeCircle.members[hoveredMember].name}${activeCircle.members[hoveredMember].isCurrentUser ? " (You)" : ""}` 
                                : (activeCircle.members[hoveredMember].isCurrentUser ? "You" : `Member #${hoveredMember + 1}`)} ({activeCircle.members[hoveredMember].address.slice(0, 6)}...{activeCircle.members[hoveredMember].address.slice(-4)})
                            </span>
                            <span className="text-xs text-white">
                              {activeCircle.members[hoveredMember].hasReceived ? (
                                <span className="text-[#78D197] font-medium">Already paid this cycle</span>
                              ) : hoveredMember === activeCircle.activePayoutIndex ? (
                                <span className="text-amber-400 font-semibold">★ Next to receive pot</span>
                              ) : (
                                <span className="text-[#8C8C8C]">Waiting for payout turn</span>
                              )}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] text-[#8C8C8C] uppercase font-bold tracking-wider">Hover nodes for details</span>
                            <span className="text-xs text-[#8C8C8C]">
                              Active Recipient: <strong className="text-[#78D197]">{activeCircle.members[activeCircle.activePayoutIndex]?.name || `Member #${activeCircle.activePayoutIndex + 1}`}</strong>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right: Circle Members & Rotation Status (7 cols) */}
                <div className="md:col-span-7 space-y-4">
                  <h4 className="text-xs font-bold text-[#8C8C8C] uppercase tracking-wider">
                    Circle Members
                  </h4>
                  <div className="border border-[#303030] rounded-2xl overflow-x-auto bg-[#000000]/40 w-full">
                    <div className="min-w-[450px] md:min-w-0">
                    <div className="grid grid-cols-12 gap-2 bg-[#0A0A0A] px-4 py-2.5 text-[10px] text-[#8C8C8C] font-semibold uppercase tracking-wider">
                      <div className="col-span-4">Member</div>
                      <div className="col-span-3">Wallet</div>
                      <div className="col-span-2 text-center">Deposit</div>
                      <div className="col-span-1 text-center text-rose-400">Missed</div>
                      <div className="col-span-2 text-right">Status</div>
                    </div>
                    
                    <div className="divide-y divide-white/5">
                      {activeCircle.members.map((m, idx) => (
                        <div key={idx} className={`grid grid-cols-12 gap-2 px-4 py-3 text-xs items-center transition ${idx === activeCircle.activePayoutIndex ? "border-y border-[#78D197]/40 bg-transparent" : ""}`}>
                          <div className="col-span-4 font-semibold text-white flex items-center space-x-1.5">
                            <span className="truncate">
                              {m.name ? `${m.name}${m.isCurrentUser ? " (You)" : ""}` : (m.isCurrentUser ? "You" : `Member #${idx + 1}`)}
                            </span>
                            {idx === activeCircle.activePayoutIndex && (
                              <span className="text-[8px] bg-transparent text-[#78D197] border border-[#78D197]/40 px-1 py-0.2 rounded font-bold uppercase tracking-wide">
                                Active
                              </span>
                            )}
                          </div>
                          <div className="col-span-3 font-mono text-[10px] text-[#8C8C8C]">
                            {m.address.slice(0, 4)}...{m.address.slice(-4)}
                          </div>
                          <div className="col-span-2 text-center font-mono font-medium text-slate-300">
                            {m.collateralBalance}
                          </div>
                          <div className="col-span-1 text-center font-mono font-bold text-rose-400">
                            {m.missed}
                          </div>
                          <div className="col-span-2 text-right">
                            {m.hasReceived ? (
                              <span className="inline-flex items-center text-[10px] font-semibold text-[#78D197] bg-transparent border border-[#78D197]/40 px-2 py-0.5 rounded-full">
                                Paid Out
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-semibold text-[#8C8C8C] bg-[#0A0A0A] border border-[#303030] px-2 py-0.5 rounded-full">
                                Pending
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* Join & Create Circles Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Join Circle */}
            <div className="p-6 rounded-2xl space-y-4 glass-panel flex flex-col justify-between">
              <div className="space-y-4">
                <h3 className="font-bold text-white flex items-center">
                  <Users className="h-4 w-4 mr-2 text-[#78D197]" />
                  <span>Join Savings Circle</span>
                </h3>
                <p className="text-xs text-[#8C8C8C]">
                  Enter an invite code to join an existing savings group on the blockchain (e.g. ROSA-1).
                </p>
                <form onSubmit={handleJoinCircle} className="space-y-4">
                  <div>
                    <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Your Name</label>
                    <input
                      type="text"
                      value={joinMemberName}
                      onChange={(e) => setJoinMemberName(e.target.value)}
                      placeholder="e.g., Alice"
                      className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Invite Code</label>
                    <input
                      type="text"
                      value={joinInviteCode}
                      onChange={(e) => setJoinInviteCode(e.target.value)}
                      placeholder="e.g., ROSA-1"
                      className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#78D197]/50 glow-input font-mono"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isJoining || !joinInviteCode.trim() || !joinMemberName.trim()}
                    className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
                  >
                    {isJoining ? (
                      <div className="h-4 w-4 border-2 border-[#303030] border-t-black rounded-full animate-spin" />
                    ) : (
                      "Join Circle"
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Create Circle */}
            <div className="p-6 rounded-2xl space-y-4 glass-panel">
              <h3 className="font-bold text-white flex items-center">
                <Plus className="h-4 w-4 mr-2 text-[#78D197]" />
                <span>Deploy New ROSA Circle</span>
              </h3>
              <form onSubmit={handleCreateCircle} className="space-y-4">
                <div>
                  <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5">Circle Name</label>
                  <input
                    type="text"
                    value={newCircleName}
                    onChange={(e) => setNewCircleName(e.target.value)}
                    placeholder="e.g., London Devs Circle"
                    className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Creator Name</label>
                  <input
                    type="text"
                    value={newCreatorName}
                    onChange={(e) => setNewCreatorName(e.target.value)}
                    placeholder="e.g., Bob"
                    className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5">Invite Code Prefix</label>
                  <input
                    type="text"
                    value={customInviteCode}
                    onChange={(e) => setCustomInviteCode(e.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase())}
                    placeholder="e.g., LONDON-DEVS"
                    className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
                  />
                  <span className="text-[9px] text-[#8C8C8C] mt-1 block">
                    Suffix with circle ID is auto-appended. E.g., LONDON-DEVS-[ID]
                  </span>
                </div>

                <div>
                  <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Stablecoin Token Address</label>
                  <input
                    type="text"
                    value={customTokenAddress}
                    onChange={(e) => setCustomTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#78D197]/50 font-mono glow-input"
                  />
                  <span className="text-[9px] text-[#8C8C8C] mt-1 block">
                    Defaults to {network.tokenName} on this network.
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#303030] space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs text-white font-semibold block">Require Collateral</label>
                      <span className="text-[9px] text-[#8C8C8C] block">Enforce safety deposits to cover defaults.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={requireCollateral}
                      onChange={(e) => setRequireCollateral(e.target.checked)}
                      className="h-4.5 w-4.5 text-[#78D197] focus:ring-violet-500 border-[#303030] bg-[#000000] rounded cursor-pointer"
                    />
                  </div>

                  {requireCollateral && (
                    <div>
                      <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Collateral Amount ({network.tokenSymbol})</label>
                      <input
                        type="number"
                        value={collateralAmount}
                        onChange={(e) => setCollateralAmount(Number(e.target.value))}
                        className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Contribution</label>
                    <input
                      type="number"
                      value={newContribution}
                      onChange={(e) => setNewContribution(Number(e.target.value))}
                      className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5">Frequency</label>
                    <select
                      value={newPeriod}
                      onChange={(e) => setNewPeriod(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-[#000000] border border-[#303030] text-white text-sm focus:outline-none focus:border-[#78D197]/50 glow-input"
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
                  disabled={isCreating || !newCircleName.trim() || !newCreatorName.trim()}
                  className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
                >
                  {isCreating ? (
                    <div className="h-4 w-4 border-2 border-[#303030] border-t-black rounded-full animate-spin" />
                  ) : (
                    "Deploy Circle"
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Simulation / Log Console */}
          <div className="rounded-2xl bg-[#000000] border border-[#303030] shadow-2xl overflow-hidden glass-panel">
            {/* Terminal Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-[#0A0A0A]/80 border-b border-[#303030]">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-[#78D197]/80" />
                <span className="text-[10px] font-mono text-[#8C8C8C] pl-2">rosa-sh -- smart-wallet-session</span>
              </div>
              <button 
                onClick={() => setSimulationLog([])}
                className="text-[10px] font-mono text-[#8C8C8C] hover:text-slate-200 transition cursor-pointer"
              >
                clear
              </button>
            </div>
            
            {/* Terminal Body */}
            <div className="h-48 p-4 overflow-y-auto font-mono text-[11px] space-y-2 text-[#8C8C8C] bg-[#000000]/90">
              <div className="flex items-center space-x-1 text-[#8C8C8C] text-[10px] border-b border-[#303030] pb-1 mb-2">
                <span>$</span>
                <span>tail -f /var/log/rosa/simulation.log</span>
              </div>
              {simulationLog.length === 0 ? (
                <div className="text-[#8C8C8C] text-center py-12">
                  No simulation events logged yet. Trigger an action to print transaction receipts.
                </div>
              ) : (
                simulationLog.map((log, i) => (
                  <div key={i}>
                    {(() => {
                      const timeMatch = log.match(/^\[(.*?)\] (.*)$/);
                      if (!timeMatch) return <span className="text-slate-300">{log}</span>;
                      const timestamp = timeMatch[1];
                      const msg = timeMatch[2];
                      
                      let badgeColor = "text-[#78D197] border-[#78D197]/30 bg-transparent";
                      let msgColor = "text-slate-300";
                      let tag = "SYSTEM";

                      if (msg.toLowerCase().includes("success") || msg.toLowerCase().includes("succeeded")) {
                        badgeColor = "text-[#78D197] border-[#78D197]/30 bg-transparent";
                        msgColor = "text-[#78D197]/95";
                        tag = "SUCCESS";
                      } else if (msg.toLowerCase().includes("error") || msg.toLowerCase().includes("failed")) {
                        badgeColor = "text-rose-400 border-rose-500/30 bg-rose-500/10";
                        msgColor = "text-rose-300/95";
                        tag = "ERROR";
                      } else if (msg.toLowerCase().includes("tx sent") || msg.toLowerCase().includes("transaction") || msg.toLowerCase().includes(" tx ")) {
                        badgeColor = "text-cyan-400 border-cyan-500/30 bg-cyan-500/10";
                        msgColor = "text-cyan-300/95";
                        tag = "TX";
                      } else if (msg.toLowerCase().includes("step")) {
                        badgeColor = "text-amber-400 border-amber-500/30 bg-amber-500/10";
                        msgColor = "text-amber-300/95";
                        tag = "STEP";
                      }

                      return (
                        <div className="flex items-start space-x-2 font-mono text-[11px] leading-relaxed">
                          <span className="text-[#8C8C8C] shrink-0 select-none">[{timestamp}]</span>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${badgeColor} shrink-0 select-none`}>
                            {tag}
                          </span>
                          <span className={`break-all ${msgColor}`}>{msg}</span>
                        </div>
                      );
                    })()}
                  </div>
                ))
              )}
            </div>
      </div>
      </div>

      {/* Withdraw Modal Overlay */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0A0A0A] border border-[#303030] rounded-3xl p-6 relative shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowWithdrawModal(false)}
              className="absolute top-4 right-4 text-[#8C8C8C] hover:text-white text-xl font-bold cursor-pointer"
            >
              &times;
            </button>
            
            <div>
              <h3 className="font-bold text-white text-lg flex items-center">
                <LogOut className="h-5 w-5 mr-2 text-red-400 rotate-180" />
                <span>Withdraw / Transfer Tokens</span>
              </h3>
              <p className="text-[10px] text-[#8C8C8C] mt-1">
                Withdraw stablecoins or custom tokens from your Smart Wallet to another recipient.
              </p>
            </div>

            <form onSubmit={handleWithdraw} className="space-y-4">
              {/* Network Selection */}
              <div>
                <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Preferred Network</label>
                <select
                  value={withdrawChainId}
                  onChange={(e) => {
                    const chainIdVal = Number(e.target.value);
                    setWithdrawChainId(chainIdVal);
                    const conf = getNetworkConfig(chainIdVal);
                    setWithdrawTokenAddress(conf.tokenAddress);
                  }}
                  className="w-full h-11 px-3 rounded-xl bg-[#000000] border border-[#303030] text-white text-xs focus:outline-none focus:border-[#78D197]/50"
                >
                  <option value={46630}>Robinhood Chain Testnet (USDG)</option>
                  <option value={421614}>Arbitrum Sepolia (USDC)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Recipient Wallet Address</label>
                <input
                  type="text"
                  value={withdrawRecipient}
                  onChange={(e) => setWithdrawRecipient(e.target.value)}
                  placeholder="0x..."
                  required
                  className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#78D197]/50 font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Amount</label>
                  <input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                    required
                    className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white text-xs focus:outline-none focus:border-[#78D197]/50"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#8C8C8C] uppercase tracking-wider block mb-1.5 font-semibold">Token Address</label>
                  <input
                    type="text"
                    value={withdrawTokenAddress}
                    onChange={(e) => setWithdrawTokenAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full h-11 px-4 rounded-xl bg-[#0A0A0A] border border-[#303030] text-white placeholder-slate-500 text-xs focus:outline-none focus:border-[#78D197]/50 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isWithdrawing || !withdrawRecipient.trim()}
                className="w-full h-11 bg-[#CCFF00] hover:bg-[#b3e600] disabled:opacity-50 text-[#000000] font-extrabold text-sm rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95 transition-transform duration-100"
              >
                {isWithdrawing ? (
                  <div className="h-4 w-4 border-2 border-[#303030] border-t-black rounded-full animate-spin" />
                ) : (
                  "Withdraw Tokens"
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
