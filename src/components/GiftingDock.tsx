/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { GIFT_ITEMS } from "../data";
import { GiftItem } from "../types";
import { Sparkles, Coins, Gift, PlusCircle, AlertCircle } from "lucide-react";

interface GiftingDockProps {
  walletBalance: number;
  onSendGift: (gift: GiftItem) => void;
  onTopupWallet: (amount: number) => void;
}

export default function GiftingDock({
  walletBalance,
  onSendGift,
  onTopupWallet,
}: GiftingDockProps) {
  const [selectedGift, setSelectedGift] = useState<GiftItem>(GIFT_ITEMS[0]);
  const [showTopupModal, setShowTopupModal] = useState(false);
  const [topupAmount, setTopupAmount] = useState(1000);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSend = () => {
    if (walletBalance < selectedGift.cost) {
      setErrorMessage(`Insufficient Stars to gift ${selectedGift.name}. Top up to send!`);
      setTimeout(() => setErrorMessage(null), 4000);
      return;
    }
    onSendGift(selectedGift);
  };

  const triggerTopup = (amt: number) => {
    onTopupWallet(amt);
    setShowTopupModal(false);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex flex-col gap-4 shadow-xl" id="gifting-dock-container">
      {/* Dock Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Gift className="w-5 h-5 text-pink-400 animate-bounce" />
          <div>
            <h3 className="font-sans font-bold text-sm text-white">Send Premium Gifts</h3>
            <p className="text-[11px] text-white/50">Interact with the streamer and boost your tier status</p>
          </div>
        </div>

        {/* Current Wallet */}
        <div className="flex items-center gap-1.5 bg-black/40 border border-white/10 rounded-full py-1 px-3">
          <Coins className="w-3.5 h-3.5 text-yellow-400" />
          <span className="font-mono text-xs font-bold text-yellow-300">{walletBalance}</span>
          <button
            onClick={() => setShowTopupModal(true)}
            className="p-0.5 rounded-full hover:bg-white/10 text-cyan-400 hover:text-cyan-300 transition-colors"
            title="Top Up Stars"
          >
            <PlusCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-950/80 border border-red-500/30 rounded-lg p-2 flex items-center gap-2 text-xs text-red-200 animate-fade-in">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
          <button
            onClick={() => setShowTopupModal(true)}
            className="ml-auto text-[10px] font-bold underline text-cyan-400 hover:text-cyan-300"
          >
            Refill Stars
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
      <div className="flex items-center justify-between gap-3 bg-black/30 rounded-xl p-3 border border-white/5">
        <div className="flex-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Gift Effect</span>
          <p className="text-xs text-white/70 leading-relaxed">{selectedGift.description}</p>
        </div>

        <button
          onClick={handleSend}
          className="px-5 py-2.5 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all active:scale-95"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Send {selectedGift.icon}</span>
        </button>
      </div>

      {/* Stars Refill Modal Overlay */}
      {showTopupModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <h3 className="text-lg font-sans font-bold text-white mb-2">Get Free Virtual Stars</h3>
            <p className="text-xs text-white/60 mb-5 leading-relaxed">
              To keep the platform's high-energy lounge accessible, load simulated coins to your wallet below instantly for free.
            </p>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[500, 2000, 10000].map((amt) => (
                <button
                  key={amt}
                  onClick={() => triggerTopup(amt)}
                  className="p-4 rounded-xl border border-white/10 hover:border-cyan-400 hover:bg-cyan-500/10 flex flex-col items-center gap-2 transition-all font-mono"
                >
                  <Coins className="w-6 h-6 text-yellow-400" />
                  <span className="text-sm font-bold text-white">+{amt} Stars</span>
                  <span className="text-[10px] text-cyan-400 font-extrabold uppercase">Free Refill</span>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowTopupModal(false)}
                className="px-4 py-2 rounded-xl text-xs bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
