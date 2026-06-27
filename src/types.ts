/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserLevel {
  BRONZE = "Bronze",
  SILVER = "Silver",
  GOLD = "Gold",
  PLATINUM = "Platinum",
  LEGENDARY = "Legendary",
}

export interface UserProfile {
  name: string;
  avatarUrl: string;
  level: UserLevel;
  levelProgress: number; // 0 to 100
  walletBalance: number; // Coins/Stars
  isStreamer: boolean;
  avatarColor: string;
}

export interface LiveRoom {
  id: string;
  title: string;
  streamerName: string;
  streamerAvatar: string;
  category: string;
  viewerCount: number;
  likeCount: number;
  bgGradient: string;
  streamType: "visualizer" | "cyber" | "ambient" | "retro" | "camera";
  isLive: boolean;
  streamerLevel: UserLevel;
  streamerLevelValue: number;
  tags: string[];
}

export interface ChatMessage {
  id: string;
  user: string;
  message: string;
  timestamp: string;
  level: UserLevel;
  levelColor: string;
  avatarColor: string;
  isGift: boolean;
  giftIcon?: string;
  giftName?: string;
  giftValue?: number;
}

export interface GiftItem {
  id: string;
  name: string;
  cost: number;
  icon: string;
  color: string;
  effectType: "heart" | "cocktail" | "portal" | "rocket" | "crown";
  description: string;
}

export interface FloatingReaction {
  id: string;
  icon: string;
  x: number;
  y: number;
  scale: number;
}
