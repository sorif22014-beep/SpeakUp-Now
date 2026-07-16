/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Play, Music, BarChart2, Radio, Trophy, RefreshCw, Volume2 } from "lucide-react";

interface StreamerToolsProps {
  viewerGoal: number;
  likeGoal: number;
  currentLikes: number;
  onMockAudienceCheer: (reaction: string) => void;
}

export default function StreamerTools({
  viewerGoal,
  likeGoal,
  currentLikes,
  onMockAudienceCheer,
}: StreamerToolsProps) {
  const [activeTab, setActiveTab] = useState<"soundboard" | "analytics">("soundboard");

  // Web Audio Synthesizer to play actual sound effects
  const playSynthSound = (type: "laser" | "sparkle" | "success" | "chime") => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      if (type === "laser") {
        // Laser/Airhorn blast
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.4);
        
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } else if (type === "sparkle") {
        // High sparkling chime
        const playChime = (freq: number, delay: number) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
          gain.gain.setValueAtTime(0.15, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.35);
        };
        playChime(1500, 0);
        playChime(1800, 0.08);
        playChime(2200, 0.16);
      } else if (type === "success") {
        // High energy fan-fare
        const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
        notes.forEach((f, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(f, ctx.currentTime + idx * 0.1);
          gain.gain.setValueAtTime(0.2, ctx.currentTime + idx * 0.1);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + idx * 0.1 + 0.25);
          
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.1);
          osc.stop(ctx.currentTime + idx * 0.1 + 0.3);
        });
      } else if (type === "chime") {
        // Warm synth ping
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.65);
      }
    } catch (e) {
      console.warn("Web Audio API blocked or failed:", e);
    }
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl" id="streamer-tools-container">
      {/* Tab Selectors */}
      <div className="flex border-b border-white/10">
        <button
          onClick={() => setActiveTab("soundboard")}
          className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "soundboard"
              ? "bg-white/5 text-purple-300 border-b-2 border-purple-500"
              : "text-white/60 hover:text-white"
          }`}
        >
          <Music className="w-4 h-4" />
          Soundboard SFX
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex-1 py-3 px-4 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === "analytics"
              ? "bg-white/5 text-purple-300 border-b-2 border-purple-500"
              : "text-white/60 hover:text-white"
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          Stream Analytics
        </button>
      </div>

      <div className="p-4">
        {activeTab === "soundboard" ? (
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-extrabold text-white/80 uppercase tracking-wide">Interactive Audio Suite</h4>
              <p className="text-[11px] text-white/50">Triggers synthesizer audio & floating hearts inside stream canvas</p>
            </div>

            {/* Sound Grid */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  playSynthSound("laser");
                  onMockAudienceCheer("⚡");
                }}
                className="p-3 rounded-xl bg-purple-600/10 border border-purple-500/20 hover:border-purple-500/60 flex items-center gap-2 text-white transition-all text-xs text-left group hover:bg-purple-600/20"
              >
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center font-bold text-sm text-purple-300 group-hover:scale-110 transition-transform">
                  🎺
                </div>
                <div>
                  <div className="font-bold">Retro Blast</div>
                  <div className="text-[10px] text-white/50">Laser audio trigger</div>
                </div>
              </button>

              <button
                onClick={() => {
                  playSynthSound("sparkle");
                  onMockAudienceCheer("✨");
                }}
                className="p-3 rounded-xl bg-cyan-600/10 border border-cyan-500/20 hover:border-cyan-500/60 flex items-center gap-2 text-white transition-all text-xs text-left group hover:bg-cyan-600/20"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center font-bold text-sm text-cyan-300 group-hover:scale-110 transition-transform">
                  ✨
                </div>
                <div>
                  <div className="font-bold">Star Sparkle</div>
                  <div className="text-[10px] text-white/50">Chime sweep sound</div>
                </div>
              </button>

              <button
                onClick={() => {
                  playSynthSound("success");
                  onMockAudienceCheer("🌟");
                }}
                className="p-3 rounded-xl bg-rose-600/10 border border-rose-500/20 hover:border-rose-500/60 flex items-center gap-2 text-white transition-all text-xs text-left group hover:bg-rose-600/20"
              >
                <div className="w-8 h-8 rounded-full bg-rose-500/20 flex items-center justify-center font-bold text-sm text-rose-300 group-hover:scale-110 transition-transform">
                  🎉
                </div>
                <div>
                  <div className="font-bold">Level Up Fanfare</div>
                  <div className="text-[10px] text-white/50">Victory arpeggio</div>
                </div>
              </button>

              <button
                onClick={() => {
                  playSynthSound("chime");
                  onMockAudienceCheer("💖");
                }}
                className="p-3 rounded-xl bg-pink-600/10 border border-pink-500/20 hover:border-pink-500/60 flex items-center gap-2 text-white transition-all text-xs text-left group hover:bg-pink-600/20"
              >
                <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center font-bold text-sm text-pink-300 group-hover:scale-110 transition-transform">
                  🔔
                </div>
                <div>
                  <div className="font-bold">Heart Chime</div>
                  <div className="text-[10px] text-white/50">Warm chime ding</div>
                </div>
              </button>
            </div>

            {/* Audience Crowd booster */}
            <div className="bg-black/30 border border-white/5 rounded-xl p-3 flex flex-col gap-2">
              <span className="text-[10px] font-bold text-purple-400 uppercase tracking-wide">Audience Cheer Booster</span>
              <div className="flex gap-2.5 justify-between">
                {[
                  { emoji: "❤️", name: "Hearts" },
                  { emoji: "🔥", name: "Fires" },
                  { emoji: "⚡", name: "Sparks" },
                  { emoji: "🌟", name: "Coins" },
                ].map((item) => (
                  <button
                    key={item.emoji}
                    onClick={() => {
                      playSynthSound("chime");
                      onMockAudienceCheer(item.emoji);
                    }}
                    className="flex-1 py-1 px-2 rounded bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs text-white transition-all"
                  >
                    <span>{item.emoji}</span>
                    <span className="text-[10px] text-white/60">{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Stream goals tracker */}
            <div>
              <h4 className="text-xs font-extrabold text-white/80 uppercase tracking-wide">Live Stream Milestone Goals</h4>
              <p className="text-[11px] text-white/50">Dynamic target tracking for active stream sessions</p>
            </div>

            <div className="space-y-3">
              {/* Likes Goal */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-yellow-400" />
                    Like Target Goal
                  </span>
                  <span className="font-mono font-bold text-white">
                    {currentLikes.toLocaleString()} / {likeGoal.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-pink-500 to-purple-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(100, (currentLikes / likeGoal) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Viewers goal */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/70 flex items-center gap-1">
                    <Radio className="w-3.5 h-3.5 text-cyan-400" />
                    Viewer Peak Milestone
                  </span>
                  <span className="font-mono font-bold text-white">
                    5,000 Goal
                  </span>
                </div>
                <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all duration-500"
                    style={{ width: "72%" }}
                  />
                </div>
              </div>
            </div>

            {/* Quick analytics card summary */}
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-white/40 uppercase">Virtual Coins</div>
                <div className="text-base font-bold text-green-400 mt-1 font-mono">1,480 CR</div>
              </div>
              <div className="bg-black/30 border border-white/5 rounded-xl p-3">
                <div className="text-[10px] text-white/40 uppercase">Avg Watchtime</div>
                <div className="text-base font-bold text-cyan-400 mt-1 font-mono">18.4 min</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
