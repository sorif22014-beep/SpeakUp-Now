/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GIFT_ITEMS } from "../data";
import { GiftItem, MicSeat } from "../types";
import { Sparkles, Coins, Gift, PlusCircle, AlertCircle, User, Check } from "lucide-react";

interface GiftingDockProps {
  walletBalance: number;
  onSendGift: (gift: GiftItem, targetId: string, targetName: string) => void;
  onTopupWallet: () => void;
  roomSeats?: MicSeat[];
  streamerName: string;
  streamerId?: string;
  recipientId: string | null;
  recipientName: string | null;
  onSelectRecipient: (id: string, name: string) => void;
  isAutoRechargeEnabled?: boolean;
  onToggleAutoRecharge?: (val: boolean) => void;
  onlineUsers?: any[];
}

export default function GiftingDock({
  walletBalance,
  onSendGift,
  onTopupWallet,
  roomSeats = [],
  streamerName,
  streamerId = "host",
  recipientId,
  recipientName,
  onSelectRecipient,
  isAutoRechargeEnabled = false,
  onToggleAutoRecharge,
  onlineUsers = [],
}: GiftingDockProps) {
  const [selectedGift, setSelectedGift] = useState<GiftItem>(GIFT_ITEMS[0]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [customInputVal, setCustomInputVal] = useState("");

  // Determine active target options
  const targetOptions: Array<{ id: string; name: string; label: string }> = [
    { id: streamerId, name: streamerName, label: `👑 রুমের হোস্ট: ${streamerName} (Host)` },
  ];

  // Add occupied seat users
  roomSeats.forEach((seat) => {
    if (seat.userId && seat.userId !== streamerId) {
      targetOptions.push({
        id: seat.userId,
        name: seat.userName || "মেম্বার",
        label: `🎙️ সিট ${seat.index + 1}: ${seat.userName} (Speaker)`,
      });
    }
  });

  // Add other online users
  if (onlineUsers && onlineUsers.length > 0) {
    onlineUsers.forEach((usr) => {
      const isAlreadyOption = targetOptions.some(opt => opt.id === usr.id);
      if (!isAlreadyOption && usr.id !== streamerId) {
        targetOptions.push({
          id: usr.id,
          name: usr.name,
          label: `👥 অনলাইন মেম্বার: @${usr.name} (Online)`,
        });
      }
    });
  }

  // Add custom manual input option
  targetOptions.push({
    id: "custom",
    name: "Custom ID",
    label: "✏️ অন্য আইডি বা নাম লিখুন / Enter Custom ID",
  });

  // Ensure current recipient is valid, else fallback to streamer/host
  const activeRecipientId = recipientId || streamerId;
  const activeRecipientName = recipientName || streamerName;

  const handleSend = () => {
    if (walletBalance < selectedGift.cost) {
      setErrorMessage(`Insufficient Coins to gift ${selectedGift.name}. Top up to send!`);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    const finalId = activeRecipientId === "custom" ? (customInputVal.trim().toLowerCase() || "custom") : activeRecipientId;
    const finalName = activeRecipientId === "custom" ? (customInputVal.trim() || "Custom User") : activeRecipientName;
    onSendGift(selectedGift, finalId, finalName);
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl" id="gifting-dock-container">
      {/* Dock Header */}
      <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-400 animate-bounce" />
          <div>
            <h3 className="font-sans font-bold text-sm text-white">উপহার পাঠান / Send Premium Gifts</h3>
            <p className="text-[11px] text-white/50">মেম্বারদের उपहार দিয়ে আকর্ষণীয় অ্যানিমেশন চালু করুন</p>
          </div>
        </div>

        {/* Current Wallet */}
        <div className="flex items-center gap-1.5 bg-black/50 border border-white/10 rounded-full py-1 px-3 self-end xs:self-auto">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-mono text-xs font-bold text-yellow-300">{walletBalance}</span>
          <button
            onClick={onTopupWallet}
            className="p-0.5 rounded-full hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Top Up Coins"
          >
            <PlusCircle className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {/* Recipient Selection Dropdown Panel */}
      <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-2">
        <label className="text-[10px] font-bold text-pink-400 uppercase tracking-wider block">
          🎁 उपहार কাকে পাঠাবেন? / Select Gift Recipient
        </label>
        
        <div className="relative">
          <select
            value={activeRecipientId}
            onChange={(e) => {
              const selected = targetOptions.find((opt) => opt.id === e.target.value);
              if (selected) {
                onSelectRecipient(selected.id, selected.name);
              }
            }}
            className="w-full bg-slate-950 border border-white/10 hover:border-pink-500/40 text-white rounded-xl py-2 px-3 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-pink-500 transition-colors cursor-pointer appearance-none"
          >
            {targetOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-slate-950 text-white py-2">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-white/40 text-xs">
            ▼
          </div>
        </div>

        {/* Custom input textbox rendered if custom is chosen */}
        {activeRecipientId === "custom" && (
          <div className="mt-2.5 animate-fade-in">
            <input
              type="text"
              placeholder="ইউজার আইডি বা নাম লিখুন (যেমন: raihan12)"
              value={customInputVal}
              onChange={(e) => {
                setCustomInputVal(e.target.value);
                onSelectRecipient("custom", e.target.value);
              }}
              className="w-full bg-slate-950 border border-pink-500/40 focus:border-pink-500 text-white rounded-xl py-2 px-3.5 text-xs font-bold font-sans focus:outline-none focus:ring-1 focus:ring-pink-500 transition-colors"
            />
          </div>
        )}

        <div className="flex items-center gap-1.5 pt-1 text-[10px] text-white/50">
          <User className="w-3.5 h-3.5 text-pink-400" />
          <span>বর্তমানে সিলেক্ট করা আছে:</span>
          <span className="text-white font-extrabold text-pink-300">
            {activeRecipientId === "custom" ? (customInputVal.trim() || "অন্য আইডি (Custom)") : `@${activeRecipientName}`}
          </span>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-950/80 border border-red-500/30 rounded-lg p-2 flex items-center gap-2 text-xs text-red-200 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={onTopupWallet}
            className="ml-auto text-[10px] font-bold underline text-cyan-400 hover:text-cyan-300"
          >
            Refill Coins
          </button>
        </div>
      )}

      {/* Grid of beautiful interactive Gifts */}
      <div className="grid grid-cols-5 gap-2">
        {GIFT_ITEMS.map((gift) => {
          const isSelected = selectedGift.id === gift.id;
          return (
            <button
              key={gift.id}
              onClick={() => setSelectedGift(gift)}
              className={`relative p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all group ${
                isSelected
                  ? "bg-purple-600/30 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.25)]"
                  : "bg-black/30 border-white/5 hover:bg-white/5 hover:border-white/10"
              }`}
            >
              <div className="text-2xl group-hover:scale-125 transition-transform duration-200">{gift.icon}</div>
              <div className="text-[10px] font-bold text-white/90 truncate max-w-full text-center">{gift.name}</div>
              
              {/* Cost Badge */}
              <div className="flex items-center gap-0.5 text-[9px] font-mono text-yellow-400 font-bold bg-black/60 rounded-full px-1.5 py-0.5">
                <span>{gift.cost}</span>
              </div>

              {/* Selection Halo */}
              {isSelected && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.8)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Description and Trigger Action */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/30 rounded-xl p-3 border border-white/5">
        <div className="flex-1 text-center sm:text-left">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 block">উপহারের প্রভাব / Gift Effect</span>
          <p className="text-xs text-white/70 leading-relaxed mt-0.5">{selectedGift.description}</p>
        </div>

        <button
          onClick={handleSend}
          className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-xl text-xs font-black flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{selectedGift.icon} পাঠান / Send Gift</span>
        </button>
      </div>
    </div>
  );
}
