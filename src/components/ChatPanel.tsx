/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, UserLevel, UserProfile } from "../types";
import { Send, Zap, Sliders, Shield, Volume2 } from "lucide-react";

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  userProfile: UserProfile;
  chatSpeed: "slow" | "normal" | "hyper" | "frozen";
  onChangeSpeed: (speed: "slow" | "normal" | "hyper" | "frozen") => void;
  onUserClick?: (userName: string) => void;
}

export default function ChatPanel({
  messages,
  onSendMessage,
  userProfile,
  chatSpeed,
  onChangeSpeed,
  onUserClick,
}: ChatPanelProps) {
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  // Helper for render level badges
  const renderBadge = (level: UserLevel) => {
    let badgeClass = "";
    switch (level) {
      case UserLevel.BRONZE:
        badgeClass = "bg-slate-700 text-slate-200 border-slate-600";
        break;
      case UserLevel.SILVER:
        badgeClass = "bg-zinc-600 text-zinc-100 border-zinc-500 shadow-[0_0_8px_rgba(228,228,231,0.2)]";
        break;
      case UserLevel.GOLD:
        badgeClass = "bg-amber-600 text-amber-100 border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
        break;
      case UserLevel.PLATINUM:
        badgeClass = "bg-violet-600 text-violet-100 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.3)]";
        break;
      case UserLevel.LEGENDARY:
        badgeClass = "bg-rose-600 text-rose-100 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.45)] animate-pulse";
        break;
    }

    return (
      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md border font-extrabold mr-1.5 flex items-center gap-0.5 ${badgeClass}`}>
        {level === UserLevel.LEGENDARY && <Shield className="w-2.5 h-2.5 animate-bounce text-yellow-300" />}
        {level}
      </span>
    );
  };

  return (
    <div className="w-full flex flex-col h-full bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl" id="chat-panel-container">
      {/* Header with Speed Controls */}
      <div className="px-4 py-3 bg-white/5 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
          <h3 className="font-sans font-semibold text-sm text-white">Live Stream Chat</h3>
        </div>

        {/* Speed selectors */}
        <div className="flex items-center gap-1 bg-black/40 rounded-lg p-1 border border-white/5">
          <Sliders className="w-3 h-3 text-white/50 ml-1 mr-1" />
          {(["slow", "normal", "hyper", "frozen"] as const).map((speed) => (
            <button
              key={speed}
              onClick={() => onChangeSpeed(speed)}
              className={`text-[10px] px-2 py-0.5 rounded capitalize transition-all ${
                chatSpeed === speed
                  ? "bg-purple-600 text-white font-semibold"
                  : "text-white/40 hover:text-white"
              }`}
            >
              {speed}
            </button>
          ))}
        </div>
      </div>

      {/* Message Feed Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-0" id="chat-messages-container">
        {messages.map((msg) => {
          if (msg.isGift) {
            // Render High-Impact Gift card
            return (
              <div
                key={msg.id}
                className="p-3 rounded-xl border flex items-center justify-between relative overflow-hidden animate-fade-in shadow-lg"
                style={{
                  background: `linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)`,
                  borderColor: "rgba(236, 72, 153, 0.3)",
                }}
              >
                {/* Accent glow line */}
                <div className="absolute top-0 bottom-0 left-0 w-1 bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.8)]" />

                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-pink-500/10 flex items-center justify-center text-xl shadow-inner border border-pink-500/20">
                    {msg.giftIcon}
                  </div>
                  <div>
                    <div className="flex items-center text-xs">
                      {renderBadge(msg.level)}
                      <span 
                        className="font-extrabold text-white cursor-pointer hover:underline"
                        onClick={() => onUserClick?.(msg.user)}
                      >
                        {msg.user}
                      </span>
                    </div>
                    <p className="text-[11px] text-pink-300 mt-0.5">
                      Gifted <span className="font-extrabold underline">{msg.giftName}</span> (+{msg.giftValue} Level XP!)
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-end">
                  <div className="text-[10px] font-mono font-bold text-white/50">{msg.timestamp}</div>
                  <div className="mt-1 px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 text-[10px] font-mono font-black border border-pink-500/30 animate-bounce">
                    +{msg.giftValue} Coins
                  </div>
                </div>
              </div>
            );
          }

          // System Join/Leave Entry Alert Message
          if (msg.isSystem) {
            return (
              <div
                key={msg.id}
                className="p-2 py-2.5 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center justify-between gap-1.5 animate-fade-in"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">👋</span>
                  <span className="font-semibold">{msg.message}</span>
                </div>
                <span className="text-[9px] font-mono opacity-50">{msg.timestamp}</span>
              </div>
            );
          }

          // Regular Message
          return (
            <div key={msg.id} className="group flex items-start gap-2.5 hover:bg-white/5 p-1.5 rounded-xl transition-all duration-150">
              {msg.photoUrl ? (
                <img 
                  src={msg.photoUrl} 
                  alt={msg.user} 
                  className="w-6.5 h-6.5 rounded-full object-cover shrink-0 border border-white/20 cursor-pointer hover:scale-105 transition-all"
                  onClick={() => onUserClick?.(msg.user)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div 
                  className="w-6.5 h-6.5 rounded-full bg-slate-800 text-[10px] font-black text-white/70 flex items-center justify-center shrink-0 border border-white/5 cursor-pointer hover:scale-105 transition-all"
                  onClick={() => onUserClick?.(msg.user)}
                >
                  {msg.user.substring(0, 2).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline flex-wrap gap-1">
                  {renderBadge(msg.level)}
                  <span
                    className="font-extrabold text-xs cursor-pointer hover:underline"
                    style={{ color: msg.avatarColor || "#89ceff" }}
                    onClick={() => onUserClick?.(msg.user)}
                  >
                    {msg.user}
                  </span>
                  <span className="text-[10px] text-white/30 font-mono ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                    {msg.timestamp}
                  </span>
                </div>
                <p className="text-sm text-slate-100/95 mt-1 leading-relaxed break-words pl-1 border-l border-white/5">
                  {msg.message}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Message input panel */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/10 bg-black/40">
        {/* User level preview */}
        <div className="flex items-center justify-between mb-2 px-1 text-xs">
          <div className="flex items-center gap-1 text-white/70">
            <span className="text-[10px] font-semibold text-purple-300 uppercase font-mono">My ID:</span>
            <span className="font-bold text-white text-xs">{userProfile.name}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-200 font-mono font-bold border border-purple-500/20">
              LV {userProfile.levelProgress < 100 ? userProfile.levelProgress : 99}
            </span>
            <span className="text-[10px] font-mono text-cyan-400">🪙 {userProfile.walletBalance} Coins</span>
          </div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Send a supportive message..."
            maxLength={150}
            className="flex-1 bg-slate-950 border border-white/10 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 rounded-xl px-3.5 py-2 text-sm text-white placeholder-white/30 outline-none transition-all"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl flex items-center justify-center transition-all hover:shadow-[0_0_15px_rgba(124,58,237,0.4)] active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
