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
  photoUrl?: string;
  age?: string;
  gender?: string;
  address?: string;
  location?: string;
  email?: string;
  phone?: string;
  followedUsers?: string[];
  friends?: string[];
  isAutoRechargeEnabled?: boolean;
  sp?: number; // Total Experience Points
  receivedGiftsCount?: number;
  receivedGiftsValue?: number;
  lastReceivedGift?: {
    icon: string;
    name: string;
    sender: string;
    timestamp: number;
  } | null;
}

export interface MicSeat {
  index: number; // 0 to 9 representing seats 1 to 10
  userId: string | null;
  userName: string | null;
  userAvatar?: string | null;
  userPhotoUrl?: string | null;
  avatarColor?: string | null;
  isMutedByHost?: boolean;
  isMicActive?: boolean;
  isCameraActive?: boolean;
  isSpeaking?: boolean;
  lastActive?: number;
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
  seats?: MicSeat[];
  streamerId?: string; // ID of the room creator
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
  photoUrl?: string;
  giftIcon?: string;
  giftName?: string;
  giftValue?: number;
  isSystem?: boolean;
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

export interface RechargeRequest {
  id: string;
  userId: string;
  userName: string;
  avatarColor: string;
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
}
