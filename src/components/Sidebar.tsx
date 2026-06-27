/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { LiveRoom, UserProfile, UserLevel } from "../types";
import { Flame, Home, Radio, Sparkles, Video, Compass, ChevronRight, User } from "lucide-react";

interface SidebarProps {
  userProfile: UserProfile;
  rooms: LiveRoom[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string) => void;
  isCreatorMode: boolean;
  onToggleCreatorMode: (val: boolean) => void;
}

export default function Sidebar({
  userProfile,
  rooms,
  activeRoomId,
  onSelectRoom,
  isCreatorMode,
  onToggleCreatorMode,
}: SidebarProps) {
  
  // Custom border/ring color based on spectator level
  const getAvatarBorder = (level: UserLevel) => {
    switch (level) {
      case UserLevel.BRONZE: return "border-slate-500 shadow-sm";
      case UserLevel.SILVER: return "border-slate-300 shadow-[0_0_10px_rgba(255,255,255,0.2)]";
      case UserLevel.GOLD: return "border-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.4)]";
      case UserLevel.PLATINUM: return "border-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.5)]";
      case UserLevel.LEGENDARY: return "border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.7)] animate-pulse";
    }
  };

  return (
    <div className="w-[300px] h-full bg-slate-950/80 backdrop-blur-xl border-r border-white/10 flex flex-col shrink-0" id="sidebar-container">
      {/* Brand logo bar */}
      <div className="px-6 py-5 border-b border-white/10 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)] animate-spin-slow">
          <Radio className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-sans font-black text-sm text-white tracking-wider uppercase bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-300">
            ATMOSPHERIC
          </h1>
          <p className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest uppercase">
            Live Stream Lounge
          </p>
        </div>
      </div>

      {/* User Progress Profile Card */}
      <div className="p-4 mx-4 my-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col gap-3 relative overflow-hidden group">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition-all duration-500" />
        
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full border-2 p-0.5 transition-all duration-300 ${getAvatarBorder(userProfile.level)}`}>
            <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-lg font-bold text-white relative overflow-hidden">
              {userProfile.avatarUrl ? (
                <img referrerPolicy="no-referrer" src={userProfile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                userProfile.name.charAt(0)
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-extrabold text-sm text-white truncate">{userProfile.name}</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-purple-900/40 text-purple-200 border border-purple-500/20">
                {userProfile.level} Class
              </span>
            </div>
          </div>
        </div>

        {/* Level Progression Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] font-mono font-semibold">
            <span className="text-white/50">Level progress to {userProfile.level === UserLevel.LEGENDARY ? "Eternal" : "Next Tier"}</span>
            <span className="text-cyan-400 font-bold">{userProfile.levelProgress}%</span>
          </div>
          <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-purple-500 via-indigo-500 to-cyan-400 h-full rounded-full transition-all duration-500"
              style={{ width: `${userProfile.levelProgress}%` }}
            />
          </div>
        </div>

        {/* Coins & Status indicator */}
        <div className="flex items-center justify-between text-xs bg-black/30 rounded-xl p-2.5 border border-white/5">
          <span className="text-white/60">Stars Balance:</span>
          <span className="font-mono font-black text-yellow-300">✨ {userProfile.walletBalance} Stars</span>
        </div>
      </div>

      {/* Mode Navigation Switcher */}
      <div className="px-4 mb-4">
        <button
          onClick={() => onToggleCreatorMode(!isCreatorMode)}
          className={`w-full py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 border transition-all ${
            isCreatorMode
              ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-[0_0_15px_rgba(0,162,230,0.15)]"
              : "bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border-transparent shadow-[0_0_15px_rgba(124,58,237,0.3)]"
          }`}
        >
          {isCreatorMode ? (
            <>
              <Compass className="w-4 h-4 text-cyan-300 animate-spin-slow" />
              <span>Back to Spectating</span>
            </>
          ) : (
            <>
              <Video className="w-4 h-4 text-purple-200 animate-pulse" />
              <span>Host Creator Studio</span>
            </>
          )}
        </button>
      </div>

      {/* Live Directory Heading */}
      <div className="px-6 py-2">
        <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
          Active Live Channels
        </span>
      </div>

      {/* Live Channels Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5 min-h-0" id="channels-scroll">
        {!isCreatorMode && rooms.map((rm) => {
          const isSelected = activeRoomId === rm.id;
          return (
            <button
              key={rm.id}
              onClick={() => onSelectRoom(rm.id)}
              className={`w-full p-2.5 rounded-xl border flex items-center justify-between text-left transition-all ${
                isSelected
                  ? "bg-purple-600/10 border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.1)]"
                  : "bg-transparent border-transparent hover:bg-white/5 hover:border-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-white/10 relative overflow-hidden shrink-0">
                  <img referrerPolicy="no-referrer" src={rm.streamerAvatar} alt={rm.streamerName} className="w-full h-full object-cover" />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-slate-900" />
                </div>

                <div className="min-w-0">
                  <div className="text-xs font-black text-white truncate flex items-center gap-1">
                    <span className="truncate">{rm.streamerName}</span>
                    <span className="text-[8px] font-mono font-extrabold px-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-500/20 shrink-0">
                      LV {rm.streamerLevelValue}
                    </span>
                  </div>
                  <p className="text-[10px] text-white/50 truncate max-w-[140px] mt-0.5">{rm.title}</p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-[9px] font-mono font-bold text-red-400 flex items-center justify-end gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 block animate-ping" />
                  <span>{rm.viewerCount >= 1000 ? `${(rm.viewerCount/1000).toFixed(1)}k` : rm.viewerCount}</span>
                </div>
                <div className="text-[8px] uppercase tracking-wider text-white/40 mt-0.5 font-bold">{rm.category}</div>
              </div>
            </button>
          );
        })}

        {isCreatorMode && (
          <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl text-center space-y-2 mx-1 mt-2">
            <Video className="w-6 h-6 text-cyan-400 mx-auto animate-pulse" />
            <p className="text-xs font-bold text-cyan-300">Creator Hub Live</p>
            <p className="text-[10px] text-cyan-200/60 leading-normal">
              You are hosting your own stream session. Viewer lists are locked while you are broadcasting.
            </p>
          </div>
        )}
      </div>

      {/* Footer Branding Credit */}
      <div className="p-4 border-t border-white/10 bg-slate-950 text-center">
        <p className="text-[10px] font-mono text-white/30">
          Atmospheric Live // v1.4.0-Stable
        </p>
      </div>
    </div>
  );
}
