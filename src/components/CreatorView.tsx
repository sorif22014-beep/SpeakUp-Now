/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { UserProfile, LiveRoom, FloatingReaction } from "../types";
import { Video, Radio, Settings, Sparkles, Flame, CheckCircle, Shield, AlertTriangle } from "lucide-react";
import LivePlayer from "./LivePlayer";
import StreamerTools from "./StreamerTools";

interface CreatorViewProps {
  userProfile: UserProfile;
  floatingReactions: FloatingReaction[];
  onAddReaction: (icon: string) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
}

export default function CreatorView({
  userProfile,
  floatingReactions,
  onAddReaction,
  isWebcamActive,
  onToggleWebcam,
}: CreatorViewProps) {
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [title, setTitle] = useState("🚀 LEVELING UP VIBES — Join the interactive live lounge");
  const [category, setCategory] = useState("Vibe");
  const [streamType, setStreamType] = useState<"visualizer" | "cyber" | "ambient" | "retro" | "camera">("cyber");
  const [likeGoal, setLikeGoal] = useState(10000);
  const [currentLikes, setCurrentLikes] = useState(1480);
  const [broadcastingTime, setBroadcastingTime] = useState(0);

  // Simulated streamer room object based on configurations
  const mockStreamerRoom: LiveRoom = {
    id: "my-custom-studio",
    title: title,
    streamerName: userProfile.name,
    streamerAvatar: userProfile.avatarUrl,
    category: category,
    viewerCount: isBroadcasting ? 1850 : 0,
    likeCount: currentLikes,
    bgGradient: "linear-gradient(135deg, #110033 0%, #330066 50%, #990099 100%)",
    streamType: streamType,
    isLive: isBroadcasting,
    streamerLevel: userProfile.level,
    streamerLevelValue: 99,
    tags: ["LiveSetup", "DIY", "Interaction", category],
  };

  // Timer for active broadcast duration
  useEffect(() => {
    let interval: any = null;
    if (isBroadcasting) {
      interval = setInterval(() => {
        setBroadcastingTime((prev) => prev + 1);
        // Slowly increment simulated likes
        setCurrentLikes((prev) => prev + Math.floor(Math.random() * 8) + 2);
      }, 1000);
    } else {
      setBroadcastingTime(0);
    }
    return () => clearInterval(interval);
  }, [isBroadcasting]);

  // Format elapsed time (MM:SS)
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex-1 p-6 overflow-y-auto space-y-6" id="creator-view-root">
      {/* Upper Status Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40 border border-white/10 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBroadcasting ? "bg-red-600 animate-pulse shadow-[0_0_15px_rgba(220,38,38,0.5)]" : "bg-purple-600/20 text-purple-400"}`}>
            <Video className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-sans font-bold text-white flex items-center gap-2">
              Creator Studio Suite
              <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${isBroadcasting ? "bg-red-600/20 text-red-300 border border-red-500/30" : "bg-white/5 text-white/50 border border-white/10"}`}>
                {isBroadcasting ? "Broadcasting Live" : "Offline / Setup Mode"}
              </span>
            </h2>
            <p className="text-xs text-white/50">Manage layout overlays, virtual audio boards, and viewer simulations</p>
          </div>
        </div>

        {isBroadcasting && (
          <div className="flex items-center gap-6 font-mono text-xs">
            <div className="bg-black/30 px-3.5 py-1.5 rounded-xl border border-white/5">
              <span className="text-white/40 block text-[9px] uppercase font-bold">Elapsed Time</span>
              <span className="text-red-400 font-extrabold text-sm">{formatTime(broadcastingTime)}</span>
            </div>
            <div className="bg-black/30 px-3.5 py-1.5 rounded-xl border border-white/5">
              <span className="text-white/40 block text-[9px] uppercase font-bold">Est. Stars Earned</span>
              <span className="text-yellow-400 font-extrabold text-sm">✨ 1,480 Stars</span>
            </div>
          </div>
        )}
      </div>

      {!isBroadcasting ? (
        /* 1. Setup Studio Configuration View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 space-y-4 shadow-xl">
              <h3 className="text-sm font-sans font-extrabold text-white flex items-center gap-1.5 uppercase tracking-wide">
                <Settings className="w-4 h-4 text-purple-400" />
                Configure Stream Meta Details
              </h3>

              {/* Title input */}
              <div className="space-y-1.5">
                <label className="text-xs text-white/60 font-medium">Broadcast Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your stream a stunning interactive title..."
                  className="w-full bg-slate-950 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                />
              </div>

              {/* Grid of details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category select */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="Music">Music DJ & Synth Set</option>
                    <option value="Vibe">Ambient Study Vibe</option>
                    <option value="ASMR">Cozy Rain ASMR</option>
                    <option value="Gaming">Competitive Cyber Arena</option>
                    <option value="Creative">Creative Workspace Coding</option>
                  </select>
                </div>

                {/* Stream preset visualization selector */}
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Visualizer Wallpaper & Input</label>
                  <select
                    value={streamType}
                    onChange={(e) => {
                      const val = e.target.value as any;
                      setStreamType(val);
                      if (val === "camera" && !isWebcamActive) {
                        onToggleWebcam();
                      } else if (val !== "camera" && isWebcamActive) {
                        onToggleWebcam();
                      }
                    }}
                    className="w-full bg-slate-950 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none"
                  >
                    <option value="cyber">Retro-Cyber Glowing horizon</option>
                    <option value="ambient">Cozy Lofi sleeping cat</option>
                    <option value="retro">Digital Soundwave tunnel grid</option>
                    <option value="visualizer">Calm Rain Ripple ASMR</option>
                    <option value="camera">Live Webcam with glass filter overlays</option>
                  </select>
                </div>
              </div>

              {/* Goal metrics inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Target Like Goal</label>
                  <input
                    type="number"
                    value={likeGoal}
                    onChange={(e) => setLikeGoal(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white outline-none font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-white/60 font-medium">Streamer Status Badge</label>
                  <div className="w-full bg-slate-950 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white flex items-center justify-between font-mono">
                    <span className="text-white/60">Host Class Verified</span>
                    <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      GOLD HOST
                    </span>
                  </div>
                </div>
              </div>

              {/* Launch Stream Trigger button */}
              <div className="pt-4">
                <button
                  onClick={() => setIsBroadcasting(true)}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-indigo-500 hover:to-cyan-400 text-white font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(124,58,237,0.4)] transition-all flex items-center justify-center gap-2"
                >
                  <Radio className="w-5 h-5 animate-pulse" />
                  <span>Start Live Broadcast Now</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {/* Guide Info Box */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl space-y-4">
              <h3 className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest">
                Host Broadcast Guidelines
              </h3>
              <p className="text-xs text-white/70 leading-relaxed">
                By hosting, you launch a customized live feed sandbox.
              </p>
              
              <ul className="space-y-3.5 text-xs text-white/60">
                <li className="flex gap-2 items-start">
                  <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Your stream feed can be simulated with customized digital wallpaper canvas waves or real camera webcams.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Audience simulated spectators will instantly populate the feed, post comments, and send sparkles.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <CheckCircle className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <span>Use your built-in **Synthesizer soundboard** to play actual chimes, sirens, or lasers directly to your live audience.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      ) : (
        /* 2. Active Broadcasting Controls View */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Active streaming stage player */}
            <LivePlayer
              room={mockStreamerRoom}
              floatingReactions={floatingReactions}
              onAddReaction={onAddReaction}
              isWebcamActive={isWebcamActive}
              onToggleWebcam={onToggleWebcam}
            />

            {/* Stop Streaming Action bar */}
            <div className="bg-red-950/40 border border-red-900/40 p-4 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-red-200">
                <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse shrink-0" />
                <span>Broadcasting at 60 FPS under stream token studio_live_session. Warning: Ending session resets views.</span>
              </div>
              <button
                onClick={() => setIsBroadcasting(false)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors"
              >
                Terminate Broadcast
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {/* Live sound effects panel */}
            <StreamerTools
              viewerGoal={5000}
              likeGoal={likeGoal}
              currentLikes={currentLikes}
              onMockAudienceCheer={onAddReaction}
            />
          </div>
        </div>
      )}
    </div>
  );
}
