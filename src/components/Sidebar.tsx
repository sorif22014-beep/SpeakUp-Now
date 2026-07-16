/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { LiveRoom, UserProfile, UserLevel } from "../types";
import { Flame, Home, Radio, Sparkles, Video, Compass, ChevronRight, User, X, MessageSquare, Search, LogOut } from "lucide-react";

interface SidebarProps {
  userProfile: UserProfile;
  rooms: LiveRoom[];
  activeRoomId: string | null;
  onSelectRoom: (roomId: string | null) => void;
  isCreatorMode: boolean;
  onToggleCreatorMode: (val: boolean) => void;
  isOpenOnMobile?: boolean;
  onCloseOnMobile?: () => void;
  activeTab: "home" | "creative" | "all-chat" | "profile";
  onChangeTab: (tab: "home" | "creative" | "all-chat" | "profile") => void;
}

export default function Sidebar({
  userProfile,
  rooms,
  activeRoomId,
  onSelectRoom,
  isCreatorMode,
  onToggleCreatorMode,
  isOpenOnMobile = false,
  onCloseOnMobile,
  activeTab,
  onChangeTab,
}: SidebarProps) {
  
  const [searchQuery, setSearchQuery] = useState("");

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

  // Filter channels based on search query (matches room title or streamer name)
  const filteredRooms = rooms.filter((rm) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      rm.title.toLowerCase().includes(q) ||
      rm.streamerName.toLowerCase().includes(q)
    );
  });

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenOnMobile && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 xl:hidden"
          onClick={onCloseOnMobile}
        />
      )}

      <div 
        className={`fixed inset-y-0 left-0 w-[280px] sm:w-[300px] h-full bg-slate-950 border-r border-white/10 flex flex-col shrink-0 transition-transform duration-300 z-50 xl:relative xl:translate-x-0 ${
          isOpenOnMobile ? "translate-x-0" : "-translate-x-full"
        }`}
        id="sidebar-container"
      >
        {/* Brand logo bar */}
        <div className="px-6 py-5 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_15px_rgba(124,58,237,0.5)]">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-sans font-black text-xs text-white tracking-wide uppercase bg-clip-text bg-gradient-to-r from-white via-slate-100 to-purple-300">
                RAIHAN'S ENGLISH
              </h1>
              <p className="text-[9px] font-mono font-bold text-cyan-400 tracking-tight uppercase">
                English Academy
              </p>
            </div>
          </div>

          {/* Close button on mobile */}
          <button 
            onClick={onCloseOnMobile}
            className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white xl:hidden border border-white/10"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
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
          <span className="text-white/60">Coins Balance:</span>
          <span className="font-mono font-black text-yellow-300">🪙 {userProfile.walletBalance} Coins</span>
        </div>
      </div>

      {/* Real-time 4-Tab Navigation */}
      <div className="px-4 mb-4 space-y-1 shrink-0">
        <div className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest px-2 mb-1.5">
          মেনু ন্যাভিগেশন / Navigation
        </div>
        
        <button
          onClick={() => {
            onChangeTab("home");
            onToggleCreatorMode(false);
          }}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all border ${
            activeTab === "home" && !isCreatorMode
              ? "bg-purple-600/20 text-purple-200 border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.15)]"
              : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
          }`}
        >
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-purple-400" />
            <span>হোম / Home</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 font-bold">Lobby</span>
        </button>

        <button
          onClick={() => {
            onChangeTab("creative");
            onToggleCreatorMode(true);
          }}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all border ${
            isCreatorMode
              ? "bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]"
              : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
          }`}
        >
          <div className="flex items-center gap-2">
            <Video className="w-4 h-4 text-cyan-400" />
            <span>ক্রিয়েটিব / Creative</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 font-bold">Studio</span>
        </button>

        <button
          onClick={() => {
            onChangeTab("all-chat");
            onToggleCreatorMode(false);
          }}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all border ${
            activeTab === "all-chat" && !isCreatorMode
              ? "bg-indigo-600/20 text-indigo-200 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
              : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
          }`}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
            <span>অল চেট / All Chat</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 font-bold">Global</span>
        </button>

        <button
          onClick={() => {
            onChangeTab("profile");
            onToggleCreatorMode(false);
          }}
          className={`w-full py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-between transition-all border ${
            activeTab === "profile" && !isCreatorMode
              ? "bg-pink-600/20 text-pink-200 border-pink-500/40 shadow-[0_0_12px_rgba(236,72,153,0.15)]"
              : "text-white/60 hover:text-white hover:bg-white/5 border-transparent"
          }`}
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-pink-400" />
            <span>প্রোফাইল / Profile</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-pink-950 text-pink-300 font-bold">My ID</span>
        </button>
      </div>

      {/* Live Directory Heading & Search Box */}
      {!isCreatorMode && (
        <div className="px-4 mb-2 mt-2 space-y-2 shrink-0">
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest">
              আড্ডা রুমের তালিকা / Channels
            </span>
            <span className="text-[10px] font-mono font-bold text-purple-400">
              {filteredRooms.length} রুম
            </span>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
            <input
              type="text"
              placeholder="রুমের নাম বা ইউজার আইডি খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-white/40 hover:text-white p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Live Channels Scroll Area */}
      <div className="flex-1 overflow-y-auto px-3 pb-6 space-y-1.5 min-h-0" id="channels-scroll">
        {!isCreatorMode && filteredRooms.map((rm) => {
          const isSelected = activeRoomId === rm.id;
          return (
            <button
              key={rm.id}
              onClick={() => {
                onSelectRoom(rm.id);
                onChangeTab("home");
              }}
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
    </>
  );
}
