"use client";

import React, { useState } from "react";
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
  HelpCircle
} from "lucide-react";
import Link from "next/link";

interface Member {
  name: string;
  address: string;
  hasReceived: boolean;
  missed: number;
  isCurrentUser?: boolean;
}

interface Circle {
  id: string;
  name: string;
  token: string;
  contribution: number;
  period: string;
  round: number;
  totalPot: number;
  yieldEarned: number;
  members: Member[];
  activePayoutIndex: number;
  inviteCode: string;
}

const INITIAL_CIRCLES: Circle[] = [
  {
    id: "1",
    name: "London Hackers Pot",
    token: "USDC",
    contribution: 150,
    period: "Monthly",
    round: 1,
    totalPot: 900,
    yieldEarned: 12.45,
    inviteCode: "LON-DEV-99",
    activePayoutIndex: 0,
    members: [
      { name: "You (Smart Wallet)", address: "0x3f...a291", hasReceived: false, missed: 0, isCurrentUser: true },
      { name: "Alice Smith", address: "0x8a...4b12", hasReceived: true, missed: 0 },
      { name: "Bob Jones", address: "0xf2...9d31", hasReceived: false, missed: 0 },
      { name: "Charlie Brown", address: "0x7c...1a22", hasReceived: false, missed: 1 },
      { name: "David Miller", address: "0x5d...8e77", hasReceived: false, missed: 0 },
      { name: "Emma Watson", address: "0x9e...6c19", hasReceived: false, missed: 0 }
    ]
  },
  {
    id: "2",
    name: "Tanda Fam UK",
    token: "USDC",
    contribution: 50,
    period: "Weekly",
    round: 3,
    totalPot: 200,
    yieldEarned: 1.88,
    inviteCode: "FAM-TANDA",
    activePayoutIndex: 1,
    members: [
      { name: "You (Smart Wallet)", address: "0x3f...a291", hasReceived: true, missed: 0, isCurrentUser: true },
      { name: "Sarah Connor", address: "0xab...32cd", hasReceived: true, missed: 0 },
      { name: "John Connor", address: "0xde...65fg", hasReceived: false, missed: 0 },
      { name: "T-800", address: "0x99...88hh", hasReceived: false, missed: 0 }
    ]
  }
];

export default function Dashboard() {
  const [circles, setCircles] = useState<Circle[]>(INITIAL_CIRCLES);
  const [selectedCircleId, setSelectedCircleId] = useState<string>("1");
  const [newCircleName, setNewCircleName] = useState("");
  const [newContribution, setNewContribution] = useState(100);
  const [newPeriod, setNewPeriod] = useState("Monthly");
  const [joinInviteCode, setJoinInviteCode] = useState("");
  const [simulationLog, setSimulationLog] = useState<string[]>([]);

  const activeCircle = circles.find(c => c.id === selectedCircleId) || circles[0];

  // Helper to add simulation logs
  const logSim = (msg: string) => {
    setSimulationLog(prev => [msg, ...prev].slice(0, 10));
  };

  // 1. Join circle via invite code
  const handleJoinCircle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinInviteCode.trim()) return;

    // Check if code matches an existing pattern or create a mock circle
    const code = joinInviteCode.toUpperCase();
    logSim(`Attempting to join circle with code: ${code}...`);
    
    // Add user as a member to a newly discovered circle or simulate
    setTimeout(() => {
      const newCircle: Circle = {
        id: (circles.length + 1).toString(),
        name: `Tanda Circle ${code}`,
        token: "USDC",
        contribution: 100,
        period: "Monthly",
        round: 1,
        totalPot: 500,
        yieldEarned: 0.00,
        inviteCode: code,
        activePayoutIndex: 0,
        members: [
          { name: "You (Smart Wallet)", address: "0x3f...a291", hasReceived: false, missed: 0, isCurrentUser: true },
          { name: "Member 2", address: "0x11...22aa", hasReceived: false, missed: 0 },
          { name: "Member 3", address: "0x33...44bb", hasReceived: false, missed: 0 },
          { name: "Member 4", address: "0x55...66cc", hasReceived: false, missed: 0 },
          { name: "Member 5", address: "0x77...88dd", hasReceived: false, missed: 0 }
        ]
      };
      setCircles(prev => [...prev, newCircle]);
      setSelectedCircleId(newCircle.id);
      setJoinInviteCode("");
      logSim(`Successfully joined ${newCircle.name}! Passkey smart account linked.`);
    }, 800);
  };

  // 2. Create new circle
  const handleCreateCircle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircleName.trim()) return;

    logSim(`Deploying new ROSA contract logic for: ${newCircleName}...`);

    setTimeout(() => {
      const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const newCircle: Circle = {
        id: (circles.length + 1).toString(),
        name: newCircleName,
        token: "USDC",
        contribution: newContribution,
        period: newPeriod,
        round: 1,
        totalPot: newContribution, // Started with user deposit
        yieldEarned: 0.00,
        inviteCode: `ROSA-${randomCode}`,
        activePayoutIndex: 0,
        members: [
          { name: "You (Smart Wallet)", address: "0x3f...a291", hasReceived: false, missed: 0, isCurrentUser: true }
        ]
      };
      setCircles(prev => [...prev, newCircle]);
      setSelectedCircleId(newCircle.id);
      setNewCircleName("");
      logSim(`ROSA Pool deployed on Robinhood Chain at 0x8f...4e2d! Invite code: ROSA-${randomCode}`);
    }, 1000);
  };

  // 3. Simulate Monthly Rotation (Trigger Rotation)
  const handleTriggerRotation = () => {
    logSim(`Triggering monthly auto-pay check for circle: ${activeCircle.name}...`);
    
    // Simulate auto-pulls using session keys
    let successCount = 0;
    activeCircle.members.forEach(m => {
      if (m.missed === 0) {
        successCount++;
      }
    });

    logSim(`Executing auto-pulls: ${successCount}/${activeCircle.members.length} members paid gaslessly.`);

    setTimeout(() => {
      setCircles(prev => prev.map(c => {
        if (c.id === activeCircle.id) {
          // Identify next recipient index
          let nextIndex = c.activePayoutIndex;
          let found = false;
          let updatedMembers = [...c.members];

          // Simple rotation: mark previous paid or loop
          for (let i = 0; i < updatedMembers.length; i++) {
            const idx = (nextIndex + i) % updatedMembers.length;
            if (!updatedMembers[idx].hasReceived) {
              updatedMembers[idx] = { ...updatedMembers[idx], hasReceived: true };
              nextIndex = (idx + 1) % updatedMembers.length;
              found = true;
              logSim(`POT PAYOUT SUCCESSFUL: Transferred ${c.totalPot} USDC to ${updatedMembers[idx].name}!`);
              break;
            }
          }

          // Reset round if all received
          let nextRound = c.round;
          if (!found) {
            logSim("Round completed! Resetting receiving flags and starting next round.");
            updatedMembers = updatedMembers.map(m => ({ ...m, hasReceived: false }));
            updatedMembers[0] = { ...updatedMembers[0], hasReceived: true };
            nextIndex = 1;
            nextRound += 1;
            logSim(`POT PAYOUT SUCCESSFUL: Transferred ${c.totalPot} USDC to ${updatedMembers[0].name}!`);
          }

          return {
            ...c,
            round: nextRound,
            activePayoutIndex: nextIndex,
            members: updatedMembers,
            yieldEarned: parseFloat((c.yieldEarned + (c.totalPot * 0.005)).toFixed(2)) // Simulate +0.5% yield addition
          };
        }
        return c;
      }));
    }, 1000);
  };

  // Calculate totals
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
            <div className="flex items-center space-x-2 border border-white/5 px-3 py-1.5 rounded-xl bg-white/5">
              <Wallet className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-200">0x3f...a291</span>
            </div>
            <Link 
              href="/"
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition"
            >
              <LogOut className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full grid lg:grid-cols-12 gap-8 z-10 overflow-y-auto">
        
        {/* Left Column - Stats & Circles List (8 cols) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Metrics summary */}
          <div className="grid sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Active Savings Capital</span>
              <span className="text-2xl font-bold text-white">{totalLocked} USDC</span>
            </div>
            <div className="p-6 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-xs text-slate-400 block mb-1">Total Yield Generated</span>
              <span className="text-2xl font-bold text-emerald-400 flex items-center">
                <TrendingUp className="h-4 w-4 mr-1.5" />
                +{totalYield.toFixed(2)} USDC
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
                    <h3 className="font-bold text-white">{c.name}</h3>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-violet-400 bg-violet-400/10 px-2 py-0.5 rounded border border-violet-400/20">
                      {c.period}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Contribution</span>
                      <span className="text-slate-200 font-semibold">{c.contribution} USDC</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Members</span>
                      <span className="text-slate-200 font-semibold">{c.members.length} active</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Total Pot</span>
                      <span className="text-emerald-400 font-semibold">{c.totalPot} USDC</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Detailed View of Selected Circle */}
          <div className="p-6 rounded-3xl bg-[#111827]/30 border border-white/5 space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <span className="text-xs text-slate-400 block uppercase tracking-wider">Active Circle Focus</span>
                <h2 className="text-xl font-bold text-white">{activeCircle.name}</h2>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block">Invite Code</span>
                  <span className="text-sm font-mono font-bold text-violet-400 bg-violet-400/5 border border-violet-400/10 px-2.5 py-1 rounded-lg">
                    {activeCircle.inviteCode}
                  </span>
                </div>
                {/* Simulation Trigger button */}
                <button
                  onClick={handleTriggerRotation}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-[#090D16] font-bold text-xs rounded-xl flex items-center space-x-1.5 shadow-md shadow-emerald-500/10"
                >
                  <Play className="h-3 w-3 fill-[#090D16]" />
                  <span>Simulate Payout</span>
                </button>
              </div>
            </div>

            {/* Circle Details Table */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Circle Members & Rotation Status</h3>
              <div className="border border-white/5 rounded-2xl overflow-hidden bg-[#090D16]/40">
                <div className="grid grid-cols-12 gap-4 bg-white/5 px-6 py-3 text-xs text-slate-400 font-medium">
                  <div className="col-span-5">Member Name</div>
                  <div className="col-span-4">Smart Account</div>
                  <div className="col-span-3 text-right">Pot Received</div>
                </div>
                
                <div className="divide-y divide-white/5">
                  {activeCircle.members.map((m, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-4 px-6 py-4 text-sm items-center">
                      <div className="col-span-5 font-semibold text-white flex items-center space-x-2">
                        <span>{m.name}</span>
                        {m.isCurrentUser && (
                          <span className="text-[9px] bg-violet-500/20 text-violet-300 border border-violet-500/30 px-1.5 py-0.2 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="col-span-4 font-mono text-xs text-slate-400">{m.address}</div>
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
                placeholder="e.g., LON-DEV-99"
                className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
              />
              <button
                type="submit"
                className="w-full h-11 bg-violet-600 hover:bg-violet-500 text-white font-semibold text-sm rounded-xl transition"
              >
                Join Circle
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
                  placeholder="e.g., London Roommates"
                  className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/5 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-violet-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1.5">Contribution (USDC)</label>
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
                    <option value="Weekly">Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-violet-600/15 transition"
              >
                Deploy Circle
              </button>
            </form>
          </div>

          {/* Simulation / Log Console */}
          <div className="p-6 rounded-2xl bg-[#111827]/40 border border-white/5 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-bold text-white text-xs uppercase tracking-wider flex items-center">
                <RotateCw className="h-3.5 w-3.5 mr-2 text-emerald-400 animate-spin-slow" />
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
                <div className="text-slate-600 text-center py-12">No simulation events logged yet. Click "Simulate Payout" to view rotation logic.</div>
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
