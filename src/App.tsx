/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { UserLevel, UserProfile, LiveRoom, ChatMessage, GiftItem, FloatingReaction } from "./types";
import { MOCK_ROOMS, GIFT_ITEMS, RANDOM_USERNAMES, MOCK_CHATS_BY_TYPE } from "./data";
import Sidebar from "./components/Sidebar";
import LivePlayer from "./components/LivePlayer";
import ChatPanel from "./components/ChatPanel";
import GiftingDock from "./components/GiftingDock";
import CreatorView from "./components/CreatorView";
import { Sparkles, Trophy, Shield, Info, X, Zap } from "lucide-react";

export default function App() {
  // 1. Core State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "LoungeSpectator_99",
    avatarUrl: "",
    level: UserLevel.BRONZE,
    levelProgress: 25,
    walletBalance: 3200,
    isStreamer: false,
    avatarColor: "#89ceff",
  });

  const [rooms, setRooms] = useState<LiveRoom[]>(MOCK_ROOMS);
  const [activeRoomId, setActiveRoomId] = useState<string>("neon-groove");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isCreatorMode, setIsCreatorMode] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [chatSpeed, setChatSpeed] = useState<"slow" | "normal" | "hyper" | "frozen">("normal");
  
  // Dialog / Info State
  const [showWelcomeTip, setShowWelcomeTip] = useState<boolean>(true);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState<string | null>(null);

  // Active room helper
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0];

  // Ref to track latest messages for callback
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // Initialize room chat feed on room switch
  useEffect(() => {
    // Generate initial comments
    const category = activeRoom.streamType;
    const pool = MOCK_CHATS_BY_TYPE[category] || MOCK_CHATS_BY_TYPE["cyber"];
    const initialMsgs: ChatMessage[] = [];

    for (let i = 0; i < 6; i++) {
      const u = RANDOM_USERNAMES[Math.floor(Math.random() * RANDOM_USERNAMES.length)];
      const text = pool[Math.floor(Math.random() * pool.length)];
      const levels = [UserLevel.BRONZE, UserLevel.SILVER, UserLevel.GOLD, UserLevel.PLATINUM];
      const level = levels[Math.floor(Math.random() * levels.length)];
      
      initialMsgs.push({
        id: `start-${i}-${Date.now()}`,
        user: u,
        message: text,
        timestamp: new Date(Date.now() - (6 - i) * 60000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        level,
        levelColor: "#ccc3d8",
        avatarColor: getRandomColor(),
        isGift: false,
      });
    }

    setMessages(initialMsgs);
  }, [activeRoomId]);

  // Periodic simulated crowd chat injector loop
  useEffect(() => {
    if (chatSpeed === "frozen") return;

    let intervalMs = 3000;
    if (chatSpeed === "slow") intervalMs = 6000;
    if (chatSpeed === "hyper") intervalMs = 800;

    const timer = setInterval(() => {
      // 10% chance to simulate a spectator sending a gift
      const triggerGift = Math.random() < 0.15;
      const pool = MOCK_CHATS_BY_TYPE[activeRoom.streamType] || MOCK_CHATS_BY_TYPE["cyber"];
      const user = RANDOM_USERNAMES[Math.floor(Math.random() * RANDOM_USERNAMES.length)];
      const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      const avatarColor = getRandomColor();
      const levels = [UserLevel.BRONZE, UserLevel.SILVER, UserLevel.GOLD, UserLevel.PLATINUM, UserLevel.LEGENDARY];
      const level = levels[Math.floor(Math.random() * levels.length)];

      if (triggerGift) {
        // Random gift
        const gift = GIFT_ITEMS[Math.floor(Math.random() * GIFT_ITEMS.length)];
        const newGiftMsg: ChatMessage = {
          id: `sim-gift-${Date.now()}`,
          user,
          message: "",
          timestamp,
          level,
          levelColor: "#ffb2b7",
          avatarColor,
          isGift: true,
          giftIcon: gift.icon,
          giftName: gift.name,
          giftValue: gift.cost,
        };

        // Append to chat
        setMessages((prev) => [...prev.slice(-30), newGiftMsg]);

        // Increment room likes as social feedback
        setRooms((prevRooms) =>
          prevRooms.map((r) =>
            r.id === activeRoomId ? { ...r, likeCount: r.likeCount + gift.cost * 10 } : r
          )
        );

        // Add corresponding floating stream reactions
        triggerBurst(gift.icon, 5);

      } else {
        // Regular comment
        const comment = pool[Math.floor(Math.random() * pool.length)];
        const newMsg: ChatMessage = {
          id: `sim-chat-${Date.now()}`,
          user,
          message: comment,
          timestamp,
          level,
          levelColor: "#ccc3d8",
          avatarColor,
          isGift: false,
        };

        setMessages((prev) => [...prev.slice(-30), newMsg]);
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [activeRoomId, chatSpeed, activeRoom.streamType]);

  // Utility to generate vibrant username color
  const getRandomColor = () => {
    const colors = ["#89ceff", "#ffb2b7", "#d2bbff", "#00ffcc", "#ffaa00", "#ff66cc", "#33ccff"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Trigger floating reaction physics
  const handleAddReaction = (icon: string) => {
    const id = `react-${Date.now()}-${Math.random()}`;
    const newReaction: FloatingReaction = {
      id,
      icon,
      x: 35 + Math.random() * 30, // center drift (35% to 65%)
      y: 90,
      scale: 0.8 + Math.random() * 0.7,
    };

    setFloatingReactions((prev) => [...prev, newReaction]);

    // Automatically clean up reaction to prevent memory leak
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== id));
    }, 3000);
  };

  // Multiple burst reaction trigger for gifts
  const triggerBurst = (icon: string, count: number) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        handleAddReaction(icon);
      }, i * 150);
    }
  };

  // Post user message & grant XP
  const handleSendMessage = (text: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      user: userProfile.name,
      message: text,
      timestamp,
      level: userProfile.level,
      levelColor: "#d2bbff",
      avatarColor: "#d2bbff",
      isGift: false,
    };

    setMessages((prev) => [...prev, userMsg]);
    handleAddReaction("❤️");
    
    // Grant XP (+6 progress)
    grantXP(6);
  };

  // Gifting Trigger from Spectator Dashboard
  const handleSendGift = (gift: GiftItem) => {
    // 1. Deduct wallet balance
    if (userProfile.walletBalance < gift.cost) return;

    setUserProfile((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - gift.cost,
    }));

    // 2. Add message to chat feed
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const giftMsg: ChatMessage = {
      id: `user-gift-${Date.now()}`,
      user: userProfile.name,
      message: "",
      timestamp,
      level: userProfile.level,
      levelColor: "#ffb2b7",
      avatarColor: "#d2bbff",
      isGift: true,
      giftIcon: gift.icon,
      giftName: gift.name,
      giftValue: gift.cost,
    };

    setMessages((prev) => [...prev, giftMsg]);

    // 3. Increment active room statistics
    setRooms((prevRooms) =>
      prevRooms.map((r) =>
        r.id === activeRoomId ? { ...r, likeCount: r.likeCount + gift.cost * 12, viewerCount: r.viewerCount + 1 } : r
      )
    );

    // 4. Trigger physics bursts
    triggerBurst(gift.icon, gift.cost >= 200 ? 12 : 6);

    // 5. Grant substantial experience progress
    // Cost provides multiplier XP
    const xpGained = Math.max(12, Math.floor(gift.cost * 0.4));
    grantXP(xpGained);
  };

  // Experience level progression tracker
  const grantXP = (amount: number) => {
    setUserProfile((prev) => {
      let nextProgress = prev.levelProgress + amount;
      let nextLevel = prev.level;
      let leveledUp = false;

      if (nextProgress >= 100) {
        nextProgress = nextProgress % 100;
        leveledUp = true;
        
        // Elevate class
        if (prev.level === UserLevel.BRONZE) nextLevel = UserLevel.SILVER;
        else if (prev.level === UserLevel.SILVER) nextLevel = UserLevel.GOLD;
        else if (prev.level === UserLevel.GOLD) nextLevel = UserLevel.PLATINUM;
        else if (prev.level === UserLevel.PLATINUM) nextLevel = UserLevel.LEGENDARY;
      }

      if (leveledUp) {
        // Trigger Level-Up Sound effect
        playChimeFanfare();
        // Trigger banner alert
        setShowLevelUpAlert(nextLevel);
      }

      return {
        ...prev,
        level: nextLevel,
        levelProgress: nextProgress,
      };
    });
  };

  // Synthesizer chime for level up chimes
  const playChimeFanfare = () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5 E5 G5 C6
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.12 + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.35);
      });
    } catch (e) {
      console.log("Web audio sound error:", e);
    }
  };

  // Topup Wallet balance (Free Refill system)
  const handleTopupWallet = (amount: number) => {
    setUserProfile((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance + amount,
    }));
  };

  // Toggle webcam stream simulation state
  const handleToggleWebcam = () => {
    setIsWebcamActive((prev) => !prev);
  };

  return (
    <div className="flex h-screen w-screen bg-[#0c0e17] text-[#e1e1ef] font-sans overflow-hidden select-none" id="app-viewport">
      {/* 1. Left Navigation Sidebar */}
      <Sidebar
        userProfile={userProfile}
        rooms={rooms}
        activeRoomId={activeRoomId}
        onSelectRoom={setActiveRoomId}
        isCreatorMode={isCreatorMode}
        onToggleCreatorMode={setIsCreatorMode}
      />

      {/* 2. Central Active View Container */}
      <div className="flex-1 flex flex-col h-full bg-[#11131c] relative">
        
        {/* Dynamic header row */}
        <header className="h-16 border-b border-white/10 px-6 flex items-center justify-between bg-slate-950/40 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            <div className="text-xs font-mono text-white/50">
              {isCreatorMode ? "Broadcasting Port: 3000 // Creator Session Mode" : `Currently connected // ${activeRoom.streamerName}'s Room`}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowWelcomeTip(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/5"
            >
              <Info className="w-3.5 h-3.5" />
              <span>Interactive Quick Guide</span>
            </button>
          </div>
        </header>

        {isCreatorMode ? (
          /* A. Creator Mode Interface */
          <CreatorView
            userProfile={userProfile}
            floatingReactions={floatingReactions}
            onAddReaction={handleAddReaction}
            isWebcamActive={isWebcamActive}
            onToggleWebcam={handleToggleWebcam}
          />
        ) : (
          /* B. Spectator View Interface (Default Split-Screen) */
          <div className="flex-1 flex flex-col xl:flex-row p-6 gap-6 overflow-hidden min-h-0" id="main-content-split">
            
            {/* Left Column: Player Stage & Gifting Dock */}
            <div className="flex-1 flex flex-col gap-6 overflow-y-auto min-h-0 pr-1">
              
              {/* Dynamic Live Stream Player Screen */}
              <LivePlayer
                room={activeRoom}
                floatingReactions={floatingReactions}
                onAddReaction={handleAddReaction}
                isWebcamActive={isWebcamActive}
                onToggleWebcam={handleToggleWebcam}
              />

              {/* Title Overlay Info card below stream */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-lg font-bold text-white shrink-0 mt-0.5">
                    {activeRoom.streamerName.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-sans font-bold text-sm text-white">{activeRoom.title}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <span className="text-[10px] uppercase font-black text-purple-300">@{activeRoom.streamerName}</span>
                      <span className="text-white/30">•</span>
                      <span className="text-[10px] font-mono text-cyan-400">Total Likes: {activeRoom.likeCount.toLocaleString()}</span>
                      <span className="text-white/30">•</span>
                      <div className="flex gap-1">
                        {activeRoom.tags.map((tg) => (
                          <span key={tg} className="text-[9px] bg-white/5 border border-white/5 rounded px-1.5 py-0.5 text-white/60">
                            #{tg}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Gifting Interaction Panel */}
              <GiftingDock
                walletBalance={userProfile.walletBalance}
                onSendGift={handleSendGift}
                onTopupWallet={handleTopupWallet}
              />
            </div>

            {/* Right Column: Chat panel */}
            <div className="w-full xl:w-[360px] h-full flex flex-col shrink-0 overflow-hidden">
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                userProfile={userProfile}
                chatSpeed={chatSpeed}
                onChangeSpeed={setChatSpeed}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. Global Informational Welcome Tutorial Modal */}
      {showWelcomeTip && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-lg flex items-center justify-center p-4 z-50 animate-fade-in" id="welcome-modal">
          <div className="bg-[#11131c] border border-white/10 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowWelcomeTip(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(124,58,237,0.5)]">
                🚀
              </div>
              <div>
                <h3 className="text-base font-sans font-black text-white uppercase tracking-wider">Welcome to Atmospheric Live!</h3>
                <p className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-widest">Immersive Social Streaming Sandbox</p>
              </div>
            </div>

            <p className="text-xs text-white/70 mb-5 leading-relaxed">
              Explore a premium high-energy social lounge concept designed with **modern glassmorphism** and responsive particle canvas feeds. Experience the premium features built into this environment:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 text-xs">
              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="font-bold text-purple-300 flex items-center gap-1">
                  💎 Custom Level Tiers
                </span>
                <p className="text-white/60 leading-normal text-[11px]">
                  Send chats (+5 XP) or premium gifts (+XP multiplier) to level up from Bronze to Silver, Gold, Platinum, and Legendary!
                </p>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="font-bold text-pink-300 flex items-center gap-1">
                  🎁 Dynamic Gifting Effects
                </span>
                <p className="text-white/60 leading-normal text-[11px]">
                  Send floating hearts, neon cocktails, portal rings, or cosmic crown overlays that explode on the active stream player!
                </p>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="font-bold text-cyan-300 flex items-center gap-1">
                  📷 Live Webcam & HUD Filters
                </span>
                <p className="text-white/60 leading-normal text-[11px]">
                  Click "Simulate Live Camera" to bind your real webcam! Toggle futuristic HUD, Cozy Glow, or monochrome glass filters in real-time.
                </p>
              </div>

              <div className="bg-white/5 border border-white/5 rounded-xl p-3 space-y-1">
                <span className="font-bold text-yellow-300 flex items-center gap-1">
                  🎙️ Synthesized Audio soundboard
                </span>
                <p className="text-white/60 leading-normal text-[11px]">
                  Go to "Host Creator Studio" to host a stream, and click SFX buttons to play synth lasers, sparkles, or success sirens using the Web Audio API!
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setShowWelcomeTip(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
              >
                Enter the Streaming Lounge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Global Full-screen Level Up Banner Alert */}
      {showLevelUpAlert && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-xl flex items-center justify-center z-50 p-4 animate-fade-in" id="level-up-modal">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl max-w-sm w-full p-6 text-center shadow-[0_0_40px_rgba(168,85,247,0.25)] relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400" />
            
            {/* Spinning background rays */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />

            <div className="w-16 h-16 rounded-full bg-purple-600/20 border-2 border-purple-500 flex items-center justify-center text-3xl mx-auto mb-4 animate-bounce">
              🏆
            </div>

            <span className="text-[10px] font-mono font-black uppercase tracking-widest text-purple-400">Class Rank Advancement</span>
            <h3 className="text-xl font-sans font-extrabold text-white mt-1 mb-2">YOU LEVELED UP!</h3>
            
            <p className="text-xs text-white/70 leading-relaxed mb-5">
              Congratulations! Your support and gifting has advanced your profile rank to the high-status <span className="font-extrabold text-purple-300 uppercase">{showLevelUpAlert}</span> tier!
            </p>

            <div className="bg-white/5 border border-white/5 rounded-xl p-3.5 mb-6 text-left space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <Shield className="w-4 h-4 text-yellow-400" />
                <span>New Status Perks Unlocked:</span>
              </div>
              <ul className="text-[10px] text-white/60 space-y-1 list-disc pl-4 font-medium">
                <li>Glow ring around profile picture in directory</li>
                <li>Exclusive status badge prefix in live chat feeds</li>
                <li>Increased experience multiplier for subsequent gifts</li>
              </ul>
            </div>

            <button
              onClick={() => setShowLevelUpAlert(null)}
              className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all"
            >
              Claim Status Rewards
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
