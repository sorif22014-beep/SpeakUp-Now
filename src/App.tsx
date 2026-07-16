/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { UserLevel, UserProfile, LiveRoom, ChatMessage, GiftItem, FloatingReaction, MicSeat } from "./types";
import { MOCK_ROOMS, GIFT_ITEMS, RANDOM_USERNAMES, MOCK_CHATS_BY_TYPE } from "./data";
import Sidebar from "./components/Sidebar";
import ChatPanel from "./components/ChatPanel";
import GiftingDock from "./components/GiftingDock";
import CreatorView from "./components/CreatorView";
import MicSeatsGrid from "./components/MicSeatsGrid";
import { Sparkles, Trophy, Shield, Info, X, Zap, Menu, Home, Video, Radio, MessageSquare, User, Users, ArrowLeft, Send, Check, Search, Coins, Trash2, Heart, LogOut } from "lucide-react";

// Real-time Firebase database integration
import { db, auth } from "./firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  increment,
  onSnapshot,
  query,
  orderBy,
  limit,
  where,
  runTransaction,
} from "firebase/firestore";

const gridColsClasses: Record<number, string> = {
  3: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6",
  7: "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7",
};

const RoomLatestComment = ({ roomId }: { roomId: string }) => {
  const [latestMsg, setLatestMsg] = useState<{ user: string; message: string } | null>(null);

  useEffect(() => {
    const msgsColRef = collection(db, "rooms", roomId, "messages");
    const q = query(msgsColRef, orderBy("createdAt", "desc"), limit(1));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        setLatestMsg({
          user: data.user || "User",
          message: data.message || "",
        });
      } else {
        setLatestMsg(null);
      }
    }, (err) => {
      console.error("Latest message listener error:", err);
    });
    return () => unsub();
  }, [roomId]);

  if (!latestMsg) {
    return (
      <div className="text-[9px] text-white/20 italic truncate">
        কোনো কমেন্ট নেই এখনো / No comments yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-black/40 border border-white/5 rounded-lg px-2 py-0.5 mt-0.5 text-[9px] text-white/75 truncate">
      <span className="font-extrabold text-pink-400 shrink-0">@{latestMsg.user}:</span>
      <span className="truncate text-white/80">{latestMsg.message}</span>
    </div>
  );
};

export default function App() {
  // 1. Core State & Firebase Auth States
  const [userId, setUserId] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  // States for Login form
  const [authEmail, setAuthEmail] = useState<string>("");
  const [authPassword, setAuthPassword] = useState<string>("");
  const [authName, setAuthName] = useState<string>("");
  const [authIsSignUp, setAuthIsSignUp] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>("");
  const [authSuccess, setAuthSuccess] = useState<string>("");
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "মেম্বার_" + Math.floor(100 + Math.random() * 900),
    avatarUrl: "",
    level: UserLevel.BRONZE,
    levelProgress: 25,
    walletBalance: 1000,
    isStreamer: false,
    avatarColor: "#89ceff",
    followedUsers: [],
    friends: [],
    isAutoRechargeEnabled: false,
  });

  // Auth changed listener to sync with Firebase / Custom Authentication
  useEffect(() => {
    let active = true;

    const bootAuth = async () => {
      const customUid = localStorage.getItem("custom_logged_in_uid");
      if (customUid) {
        const userDocRef = doc(db, "users", customUid);
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists() && active) {
            const data = userDoc.data();
            setUserId(customUid);
            setUserProfile({
              name: data.name || customUid,
              avatarUrl: data.photoUrl || "",
              level: data.level || UserLevel.BRONZE,
              levelProgress: data.levelProgress ?? 25,
              walletBalance: data.walletBalance ?? 1000,
              isStreamer: data.isStreamer ?? false,
              avatarColor: data.avatarColor || "#89ceff",
              photoUrl: data.photoUrl || "",
              age: data.age || "",
              gender: data.gender || "",
              address: data.address || "",
              location: data.location || "",
              email: data.email || "",
              phone: data.phone || "",
              followedUsers: data.followedUsers || [],
              friends: data.friends || [],
              isAutoRechargeEnabled: data.isAutoRechargeEnabled ?? false,
              sp: data.sp !== undefined ? data.sp : (data.levelProgress !== undefined ? data.levelProgress : 100),
              receivedGiftsCount: data.receivedGiftsCount || 0,
              receivedGiftsValue: data.receivedGiftsValue || 0,
              lastReceivedGift: data.lastReceivedGift || null,
            });
            setIsAuthLoading(false);
            return () => {};
          }
        } catch (err) {
          console.error("Error loading custom profile on boot:", err);
        }
      }

      // Fallback to Firebase auth state listener
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (!active) return;
        if (user) {
          setUserId(user.uid);
          const userDocRef = doc(db, "users", user.uid);
          try {
            const userDoc = await getDoc(userDocRef);
            if (userDoc.exists() && active) {
              const data = userDoc.data();
              setUserProfile({
                name: data.name || user.displayName || "মেম্বার_" + Math.floor(100 + Math.random() * 900),
                avatarUrl: data.photoUrl || user.photoURL || "",
                level: data.level || UserLevel.BRONZE,
                levelProgress: data.levelProgress ?? 25,
                walletBalance: data.walletBalance ?? 1000,
                isStreamer: data.isStreamer ?? false,
                avatarColor: data.avatarColor || "#89ceff",
                photoUrl: data.photoUrl || user.photoURL || "",
                age: data.age || "",
                gender: data.gender || "",
                address: data.address || "",
                location: data.location || "",
                email: data.email || "",
                phone: data.phone || "",
                followedUsers: data.followedUsers || [],
                friends: data.friends || [],
                isAutoRechargeEnabled: data.isAutoRechargeEnabled ?? false,
                sp: data.sp !== undefined ? data.sp : (data.levelProgress !== undefined ? data.levelProgress : 100),
                receivedGiftsCount: data.receivedGiftsCount || 0,
                receivedGiftsValue: data.receivedGiftsValue || 0,
                lastReceivedGift: data.lastReceivedGift || null,
              });
            } else if (active) {
              // Document doesn't exist yet, create initial profile
              const newProfile: UserProfile = {
                name: user.displayName || "মেম্বার_" + Math.floor(100 + Math.random() * 900),
                avatarUrl: user.photoURL || "",
                level: UserLevel.BRONZE,
                levelProgress: 25,
                walletBalance: 1000,
                isStreamer: false,
                avatarColor: "#89ceff",
                photoUrl: user.photoURL || "",
                age: "",
                gender: "",
                address: "",
                location: "",
                email: "",
                phone: "",
                followedUsers: [],
                friends: [],
                isAutoRechargeEnabled: false,
                sp: 100,
                receivedGiftsCount: 0,
                receivedGiftsValue: 0,
                lastReceivedGift: null,
              };
              await setDoc(userDocRef, {
                id: user.uid,
                ...newProfile,
                lastActive: Date.now()
              });
              setUserProfile(newProfile);
            }
          } catch (err) {
            console.error("Error loading user profile:", err);
          }
        } else {
          setUserId(null);
        }
        setIsAuthLoading(false);
      });

      return unsubscribe;
    };

    let unsub: any;
    bootAuth().then(res => {
      unsub = res;
    });

    return () => {
      active = false;
      if (unsub && typeof unsub === "function") unsub();
    };
  }, []);

  const [activeTab, setActiveTab] = useState<"home" | "users" | "creative" | "all-chat" | "profile">("home");
  const [rooms, setRooms] = useState<LiveRoom[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null); // starts in the Lobby!
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [isCreatorMode, setIsCreatorMode] = useState<boolean>(false);
  const [isWebcamActive, setIsWebcamActive] = useState<boolean>(false);
  const [chatSpeed, setChatSpeed] = useState<"slow" | "normal" | "hyper" | "frozen">("normal");
  const [language, setLanguage] = useState<"BN" | "EN">("BN");
  
  // Real-time Global Lounge All-Chat state
  const [loungeMessages, setLoungeMessages] = useState<ChatMessage[]>([]);
  const [loungeInput, setLoungeInput] = useState("");
  const [loungeSearchQuery, setLoungeSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [lobbyGridCols, setLobbyGridCols] = useState<number>(5);

  // Visiting profile ID states
  const [visitedUser, setVisitedUser] = useState<any | null>(null);
  const [isSearchingUser, setIsSearchingUser] = useState<boolean>(false);

  // Dialog / Info State
  const [showWelcomeTip, setShowWelcomeTip] = useState<boolean>(true);
  const [showLevelUpAlert, setShowLevelUpAlert] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string>("");

  // Mobile layout & responsive control states
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [activeMobileTab, setActiveMobileTab] = useState<"stream" | "chat">("stream");
  const [lobbySocialTab, setLobbySocialTab] = useState<"following" | "fans">("following");

  // Recharge & Admin States
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [isRechargeModalOpen, setIsRechargeModalOpen] = useState<boolean>(false);
  const [isSubmittingRecharge, setIsSubmittingRecharge] = useState<boolean>(false);
  const [rechargeSuccessMessage, setRechargeSuccessMessage] = useState<string>("");
  const [rechargeRequests, setRechargeRequests] = useState<any[]>([]);
  const [selectedPackageForPayment, setSelectedPackageForPayment] = useState<any | null>(null);
  const [senderPhoneNumber, setSenderPhoneNumber] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"bkash" | "nagad">("bkash");

  // Dynamic coin packages list
  const [coinPackages, setCoinPackages] = useState<{ amount: number; price: number }[]>([
    { amount: 15, price: 15 },
    { amount: 50, price: 50 },
    { amount: 100, price: 95 },
    { amount: 120, price: 114 },
    { amount: 150, price: 143 },
    { amount: 200, price: 190 },
    { amount: 250, price: 238 },
    { amount: 300, price: 285 },
    { amount: 350, price: 333 },
    { amount: 450, price: 428 },
  ]);

  // Admin Credentials authorized status (checking: sorif22014@gmail.com / 01820307230, pass: sorif240011xc)
  const [isAdminAuthorized, setIsAdminAuthorized] = useState<boolean>(() => {
    return sessionStorage.getItem("is_admin_authorized") === "true";
  });
  const [adminLoginEmail, setAdminLoginEmail] = useState<string>("");
  const [adminLoginPassword, setAdminLoginPassword] = useState<string>("");
  const [adminLoginError, setAdminLoginError] = useState<string>("");

  // States for creating a new package in admin panel
  const [newPackageAmount, setNewPackageAmount] = useState<string>("");
  const [newPackagePrice, setNewPackagePrice] = useState<string>("");

  // States for inline package editing
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingAmount, setEditingAmount] = useState<string>("");
  const [editingPrice, setEditingPrice] = useState<string>("");

  // Sub-tab for admin controls
  const [adminSubTab, setAdminSubTab] = useState<"requests" | "packages">("requests");

  // Google Sign-In with Popup
  const handleGoogleSignIn = async () => {
    setIsSubmittingAuth(true);
    setAuthError("");
    setAuthSuccess("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      setAuthSuccess("গুগল অ্যাকাউন্ট দিয়ে সফলভাবে লগইন করা হয়েছে!");
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      if (err.code === "auth/popup-blocked") {
        setAuthError("পপআপ ব্রাউজার দ্বারা ব্লক করা হয়েছে। অনুগ্রহ করে পপআপ অনুমোদন দিন।");
      } else {
        setAuthError("গুগল অনুমোতি ব্যর্থ হয়েছে: " + (err.message || err));
      }
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Unified Custom Login: Match existing ID & password, or auto-create new account!
  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSuccess("");
    const targetUserId = authEmail.trim().toLowerCase();
    const targetPassword = authPassword.trim();

    if (!targetUserId || !targetPassword) {
      setAuthError("ইউজার আইডি এবং পাসওয়ার্ড সঠিকভাবে প্রদান করুন!");
      return;
    }

    if (targetPassword.length < 6) {
      setAuthError("পাসওয়ার্ড অবশ্যই কমপক্ষে ৬ অক্ষরের হতে হবে!");
      return;
    }

    setIsSubmittingAuth(true);
    try {
      const userDocRef = doc(db, "users", targetUserId);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        // Check if password matches
        if (data.password === targetPassword) {
          localStorage.setItem("custom_logged_in_uid", targetUserId);
          setUserId(targetUserId);
          setUserProfile({
            name: data.name || targetUserId,
            avatarUrl: data.photoUrl || "",
            level: data.level || UserLevel.BRONZE,
            levelProgress: data.levelProgress ?? 25,
            walletBalance: data.walletBalance ?? 1000,
            isStreamer: data.isStreamer ?? false,
            avatarColor: data.avatarColor || "#89ceff",
            photoUrl: data.photoUrl || "",
            age: data.age || "",
            gender: data.gender || "",
            address: data.address || "",
            location: data.location || "",
            email: data.email || "",
            phone: data.phone || "",
            followedUsers: data.followedUsers || [],
            friends: data.friends || [],
            isAutoRechargeEnabled: data.isAutoRechargeEnabled ?? false,
            sp: data.sp !== undefined ? data.sp : (data.levelProgress !== undefined ? data.levelProgress : 100),
            receivedGiftsCount: data.receivedGiftsCount || 0,
            receivedGiftsValue: data.receivedGiftsValue || 0,
            lastReceivedGift: data.lastReceivedGift || null,
          });
          setAuthSuccess("সফলভাবে লগইন করা হয়েছে!");
          setAuthEmail("");
          setAuthPassword("");
        } else {
          setAuthError("ভুল পাসওয়ার্ড! এই ইউজার আইডির জন্য সঠিক পাসওয়ার্ড দিন অথবা নতুন কোনো আইডি ব্যবহার করুন।");
        }
      } else {
        // Create a new account!
        const newProfile: UserProfile = {
          name: targetUserId, // Default name is the custom User ID
          avatarUrl: "",
          level: UserLevel.BRONZE,
          levelProgress: 25,
          walletBalance: 1000,
          isStreamer: false,
          avatarColor: "#89ceff",
          photoUrl: "",
          age: "",
          gender: "",
          address: "",
          location: "",
          email: "",
          phone: "",
          followedUsers: [],
          friends: [],
          isAutoRechargeEnabled: false,
          sp: 100,
          receivedGiftsCount: 0,
          receivedGiftsValue: 0,
          lastReceivedGift: null,
        };

        await setDoc(userDocRef, {
          id: targetUserId,
          password: targetPassword,
          customUserId: targetUserId,
          ...newProfile,
          lastActive: Date.now()
        });

        localStorage.setItem("custom_logged_in_uid", targetUserId);
        setUserId(targetUserId);
        setUserProfile(newProfile);
        setAuthSuccess("নতুন অ্যাকাউন্ট সফলভাবে তৈরি এবং লগইন করা হয়েছে!");
        setAuthEmail("");
        setAuthPassword("");
      }
    } catch (err: any) {
      console.error("Custom login error:", err);
      setAuthError("লগইন ব্যর্থ হয়েছে: " + err.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Sign Out
  const handleSignOut = async () => {
    try {
      localStorage.removeItem("custom_logged_in_uid");
      await signOut(auth);
      setUserId(null);
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Sync Coin Packages from Firestore
  useEffect(() => {
    const configDocRef = doc(db, "settings", "coin_config");
    const unsubscribe = onSnapshot(configDocRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.packages && Array.isArray(data.packages)) {
          setCoinPackages(data.packages);
        }
      } else {
        // Seed initial packages
        const initialPackages = [
          { amount: 15, price: 15 },
          { amount: 50, price: 50 },
          { amount: 100, price: 95 },
          { amount: 120, price: 114 },
          { amount: 150, price: 143 },
          { amount: 200, price: 190 },
          { amount: 250, price: 238 },
          { amount: 300, price: 285 },
          { amount: 350, price: 333 },
          { amount: 450, price: 428 },
        ];
        setDoc(configDocRef, { packages: initialPackages })
          .then(() => console.log("Seeded initial coin packages successfully"))
          .catch((err) => console.error("Error seeding packages:", err));
      }
    }, (error) => {
      console.error("Firestore onSnapshot error for coin_config:", error);
    });
    return () => unsubscribe();
  }, []);

  // Admin CRUD helper functions for coin packages
  const saveCoinPackagesToFirestore = async (updatedPackages: { amount: number; price: number }[]) => {
    try {
      const configDocRef = doc(db, "settings", "coin_config");
      await setDoc(configDocRef, { packages: updatedPackages });
    } catch (err) {
      console.error("Error saving coin packages to firestore:", err);
      alert("প্যাকেজ সংরক্ষণ করতে ব্যর্থ হয়েছে।");
    }
  };

  const handleAddCoinPackage = () => {
    const amt = parseInt(newPackageAmount);
    const prc = parseInt(newPackagePrice);
    if (isNaN(amt) || amt <= 0 || isNaN(prc) || prc <= 0) {
      alert("সঠিক কয়েন এবং টাকার পরিমাণ লিখুন!");
      return;
    }
    if (coinPackages.some((p) => p.amount === amt)) {
      alert("এই কয়েন পরিমাণের প্যাকেজ ইতিমধ্যে বিদ্যমান!");
      return;
    }
    const updated = [...coinPackages, { amount: amt, price: prc }].sort((a, b) => a.amount - b.amount);
    setCoinPackages(updated);
    saveCoinPackagesToFirestore(updated);
    setNewPackageAmount("");
    setNewPackagePrice("");
  };

  const handleDeleteCoinPackage = (amountToDelete: number) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই প্যাকেজটি ডিলিট করতে চান?")) return;
    const updated = coinPackages.filter((p) => p.amount !== amountToDelete);
    setCoinPackages(updated);
    saveCoinPackagesToFirestore(updated);
  };

  const handleUpdateCoinPackage = (oldAmount: number, newAmount: number, newPrice: number) => {
    if (isNaN(newAmount) || newAmount <= 0 || isNaN(newPrice) || newPrice <= 0) {
      alert("সঠিক পরিমাণ লিখুন!");
      return;
    }
    const updated = coinPackages.map((p) => {
      if (p.amount === oldAmount) {
        return { amount: newAmount, price: newPrice };
      }
      return p;
    }).sort((a, b) => a.amount - b.amount);

    setCoinPackages(updated);
    saveCoinPackagesToFirestore(updated);
    alert("প্যাকেজ আপডেট করা হয়েছে!");
  };

  const handleResetCoinPackages = () => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে ডিফল্ট প্যাকেজ সমূহে রিসেট করতে চান?")) return;
    const defaultPackages = [
      { amount: 15, price: 15 },
      { amount: 50, price: 50 },
      { amount: 100, price: 95 },
      { amount: 120, price: 114 },
      { amount: 150, price: 143 },
      { amount: 200, price: 190 },
      { amount: 250, price: 238 },
      { amount: 300, price: 285 },
      { amount: 350, price: 333 },
      { amount: 450, price: 428 },
    ];
    setCoinPackages(defaultPackages);
    saveCoinPackagesToFirestore(defaultPackages);
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoginError("");
    const identifier = adminLoginEmail.trim();
    const pass = adminLoginPassword.trim();

    if (!identifier || !pass) {
      setAdminLoginError("অনুগ্রহ করে ইমেইল/মোবাইল এবং পাসওয়ার্ড লিখুন।");
      return;
    }

    if (
      (identifier === "sorif22014@gmail.com" || identifier === "01820307230") &&
      pass === "sorif240011xc"
    ) {
      setIsAdminAuthorized(true);
      sessionStorage.setItem("is_admin_authorized", "true");
      setAdminLoginEmail("");
      setAdminLoginPassword("");
      setAdminLoginError("");
    } else {
      setAdminLoginError("ভুল ইমেইল/মোবাইল অথবা পাসওয়ার্ড!");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminAuthorized(false);
    sessionStorage.removeItem("is_admin_authorized");
  };

  // Real-time entry notice for pure audio room
  const [activeEntryNotice, setActiveEntryNotice] = useState<string | null>(null);
  const lastSeenSystemIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!messages || messages.length === 0) return;
    const systemMsgs = messages.filter((m) => m.isSystem);
    if (systemMsgs.length === 0) return;
    const latest = systemMsgs[systemMsgs.length - 1];

    if (latest.id && latest.id !== lastSeenSystemIdRef.current) {
      lastSeenSystemIdRef.current = latest.id;
      setActiveEntryNotice(latest.message);
      const timer = setTimeout(() => {
        setActiveEntryNotice(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [messages]);

  // Active room helper
  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null;

  // Selected gift recipient states
  const [recipientId, setRecipientId] = useState<string | null>(null);
  const [recipientName, setRecipientName] = useState<string | null>(null);

  // Sync selected recipient when active room changes
  useEffect(() => {
    if (activeRoom) {
      setRecipientId(activeRoom.streamerId || "host");
      setRecipientName(activeRoom.streamerName);
    } else {
      setRecipientId(null);
      setRecipientName(null);
    }
  }, [activeRoomId, activeRoom?.streamerId, activeRoom?.streamerName]);

  // Ref to track latest messages for callback
  const messagesRef = useRef(messages);
  messagesRef.current = messages;

  // 1. Purge robotic channels, stream active rooms, and track real-time user presence
  useEffect(() => {
    const syncRooms = async () => {
      try {
        const roboticIds = ["neon-groove", "chill-lofibeats", "synth-neon-retro", "asmr-rain-sleep"];
        for (const rId of roboticIds) {
          try {
            await deleteDoc(doc(db, "rooms", rId));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Purging error:", err);
      }

      // Live listener to active rooms list
      const unsub = onSnapshot(collection(db, "rooms"), (snap) => {
        const updatedRooms: LiveRoom[] = [];
        snap.forEach((docSnap) => {
          updatedRooms.push({ id: docSnap.id, ...docSnap.data() } as LiveRoom);
        });
        setRooms(updatedRooms);
      });

      return unsub;
    };

    let unsubRooms: (() => void) | undefined;
    syncRooms().then((unsub) => {
      unsubRooms = unsub;
    });

    return () => {
      if (unsubRooms) unsubRooms();
    };
  }, []);

  // Sync current user's profile presence in Firestore
  useEffect(() => {
    if (!userId) return;
    const syncPresence = async () => {
      try {
        const userDocRef = doc(db, "users", userId);
        await setDoc(userDocRef, {
          id: userId,
          name: userProfile.name,
          avatarColor: userProfile.avatarColor || "#89ceff",
          level: userProfile.level,
          levelProgress: userProfile.levelProgress,
          walletBalance: userProfile.walletBalance,
          photoUrl: userProfile.photoUrl || "",
          age: userProfile.age || "",
          gender: userProfile.gender || "",
          address: userProfile.address || "",
          location: userProfile.location || "",
          email: userProfile.email || "",
          phone: userProfile.phone || "",
          followedUsers: userProfile.followedUsers || [],
          friends: userProfile.friends || [],
          isAutoRechargeEnabled: userProfile.isAutoRechargeEnabled || false,
          lastActive: Date.now(),
        }, { merge: true });
      } catch (e) {
        console.error("Error syncing presence:", e);
      }
    };

    syncPresence();
    const interval = setInterval(syncPresence, 60000); // Heartbeat every 60s
    return () => clearInterval(interval);
  }, [userId, userProfile.name, userProfile.avatarColor, userProfile.level, userProfile.levelProgress, userProfile.walletBalance, userProfile.photoUrl, userProfile.age, userProfile.gender, userProfile.address, userProfile.location, userProfile.email, userProfile.phone, userProfile.followedUsers, userProfile.friends, userProfile.isAutoRechargeEnabled]);

  // Sync list of active online users in real-time
  useEffect(() => {
    const usersColRef = collection(db, "users");
    const q = query(usersColRef, orderBy("lastActive", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setOnlineUsers(list);
    });
    return () => unsub();
  }, []);

  // Real-time listener for current user's wallet balance / profile updates from Firestore (e.g. on admin approval or gifting)
  useEffect(() => {
    if (!userId) return;
    const userDocRef = doc(db, "users", userId);
    const unsub = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserProfile((prev) => ({
          ...prev,
          name: data.name || prev.name,
          walletBalance: data.walletBalance !== undefined ? data.walletBalance : prev.walletBalance,
          level: data.level || prev.level,
          levelProgress: data.levelProgress !== undefined ? data.levelProgress : prev.levelProgress,
          photoUrl: data.photoUrl || prev.photoUrl,
          avatarColor: data.avatarColor || prev.avatarColor,
          age: data.age || prev.age,
          gender: data.gender || prev.gender,
          address: data.address || prev.address,
          location: data.location || prev.location,
          email: data.email || prev.email,
          phone: data.phone || prev.phone,
          followedUsers: data.followedUsers || prev.followedUsers || [],
          friends: data.friends || prev.friends || [],
          isAutoRechargeEnabled: data.isAutoRechargeEnabled ?? prev.isAutoRechargeEnabled ?? false,
          sp: data.sp !== undefined ? data.sp : prev.sp,
          receivedGiftsCount: data.receivedGiftsCount || prev.receivedGiftsCount || 0,
          receivedGiftsValue: data.receivedGiftsValue || prev.receivedGiftsValue || 0,
          lastReceivedGift: data.lastReceivedGift || prev.lastReceivedGift || null,
        }));
      }
    });
    return () => unsub();
  }, [userId]);

  // Real-time listener for all recharge requests, so that admins can see them
  useEffect(() => {
    const q = query(collection(db, "recharge_requests"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const reqs: any[] = [];
      snap.forEach((docSnap) => {
        reqs.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRechargeRequests(reqs);
    });
    return () => unsub();
  }, []);

  // 2. Real-time viewer tracking: Increment on entering, decrement on leaving
  useEffect(() => {
    if (!activeRoomId) return;
    const roomDocRef = doc(db, "rooms", activeRoomId);
    
    // Safely increment viewer count in Firestore
    updateDoc(roomDocRef, {
      viewerCount: increment(1)
    }).catch((err) => console.log("Failed to increment viewer count:", err));

    // Post real-time room entry system message
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const entryMsg = {
      user: "System",
      message: `${userProfile.name} আড্ডাঘরে প্রবেশ করেছেন! 👋`,
      timestamp,
      level: userProfile.level,
      levelColor: "#10b981",
      avatarColor: "#ffffff",
      photoUrl: userProfile.photoUrl || "",
      isSystem: true,
      createdAt: Date.now(),
    };
    addDoc(collection(db, "rooms", activeRoomId, "messages"), entryMsg).catch((err) => {
      console.error("Firestore post entry system message error:", err);
    });

    return () => {
      updateDoc(roomDocRef, {
        viewerCount: increment(-1)
      }).catch((err) => console.log("Failed to decrement viewer count:", err));
    };
  }, [activeRoomId]);

  // Clean up user's occupied seats when they leave a room
  const previousRoomIdRef = useRef<string | null>(null);
  useEffect(() => {
    const prevRoomId = previousRoomIdRef.current;
    previousRoomIdRef.current = activeRoomId;

    if (prevRoomId && prevRoomId !== activeRoomId) {
      const roomDocRef = doc(db, "rooms", prevRoomId);
      runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomDocRef);
        if (!snap.exists()) return;
        const data = snap.data();
        let currentSeats: MicSeat[] = data.seats || [];
        if (currentSeats.length === 0) return;
        
        let changed = false;
        currentSeats = currentSeats.map(s => {
          if (s.userId === userId) {
            changed = true;
            return {
              index: s.index,
              userId: null,
              userName: null,
              userAvatar: null,
              userPhotoUrl: null,
              avatarColor: null,
              isMutedByHost: false,
              isMicActive: true,
              isCameraActive: true,
              isSpeaking: false,
            };
          }
          return s;
        });

        if (changed) {
          transaction.update(roomDocRef, { seats: currentSeats });
        }
      }).catch((err) => {
        console.log("Failed to clean up seats on leave:", err);
      });
    }
  }, [activeRoomId, userId]);

  // Clean up user's active seat and viewer count synchronously/asynchronously during window unload
  useEffect(() => {
    const handleUnload = () => {
      if (!activeRoomId) return;
      
      const roomDocRef = doc(db, "rooms", activeRoomId);
      // Decrement viewer count on unload
      updateDoc(roomDocRef, {
        viewerCount: increment(-1)
      }).catch(() => {});

      // Clear our seat if we are sitting
      runTransaction(db, async (transaction) => {
        const snap = await transaction.get(roomDocRef);
        if (!snap.exists()) return;
        const data = snap.data();
        let currentSeats: MicSeat[] = data.seats || [];
        if (currentSeats.length === 0) return;
        
        let changed = false;
        currentSeats = currentSeats.map(s => {
          if (s.userId === userId) {
            changed = true;
            return {
              index: s.index,
              userId: null,
              userName: null,
              userAvatar: null,
              userPhotoUrl: null,
              avatarColor: null,
              isMutedByHost: false,
              isMicActive: true,
              isCameraActive: true,
              isSpeaking: false,
              lastActive: 0,
            };
          }
          return s;
        });

        if (changed) {
          transaction.update(roomDocRef, { seats: currentSeats });
        }
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", handleUnload);
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [activeRoomId, userId]);

  // 3. Real-time Live Chats Subscription
  useEffect(() => {
    if (!activeRoomId) return;
    // Listen to latest 40 messages ordered by creation time
    const msgsColRef = collection(db, "rooms", activeRoomId, "messages");
    const q = query(msgsColRef, orderBy("createdAt", "desc"), limit(40));

    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      // Reverse so it's rendering in chronological order
      setMessages(msgs.reverse());
    });

    return () => unsub();
  }, [activeRoomId]);

  // 4. Real-time Floating Reactions Subscription
  useEffect(() => {
    if (!activeRoomId) return;
    const reactionsColRef = collection(db, "rooms", activeRoomId, "reactions");
    const startTime = Date.now() - 3000; // Only listen to fresh reactions
    const q = query(reactionsColRef, orderBy("createdAt", "desc"), limit(10));

    const unsub = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.createdAt > startTime) {
            const reactId = change.doc.id;
            const newReaction: FloatingReaction = {
              id: reactId,
              icon: data.icon,
              x: data.x,
              y: data.y,
              scale: data.scale,
            };

            setFloatingReactions((prev) => {
              if (prev.some((r) => r.id === reactId)) return prev;
              return [...prev, newReaction];
            });

            // Automatically clean up reaction locally to prevent memory leak
            setTimeout(() => {
              setFloatingReactions((prev) => prev.filter((r) => r.id !== reactId));
            }, 3000);
          }
        }
      });
    });

    return () => unsub();
  }, [activeRoomId]);

  // 4b. Real-time Global Lounge Chat Subscription
  useEffect(() => {
    const msgsColRef = collection(db, "global_messages");
    const q = query(msgsColRef, orderBy("createdAt", "desc"), limit(60));

    const unsub = onSnapshot(q, (snap) => {
      const msgs: ChatMessage[] = [];
      snap.forEach((docSnap) => {
        msgs.push({ id: docSnap.id, ...docSnap.data() } as ChatMessage);
      });
      setLoungeMessages(msgs.reverse());
    });

    return () => unsub();
  }, []);

  // 5. Simulated Crowd Chat Injector Loop disabled to ensure only real-time real users are active in the chat
  useEffect(() => {
    // Disabled to prevent bot IDs from flooding the real-time chat.
    // Only real users will appear in the stream chat now.
  }, []);

  // Utility to generate vibrant username color
  const getRandomColor = () => {
    const colors = ["#89ceff", "#ffb2b7", "#d2bbff", "#00ffcc", "#ffaa00", "#ff66cc", "#33ccff"];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Look up a user profile in Firestore by username when clicked in chat
  const handleUserClick = async (userName: string) => {
    setIsSearchingUser(true);
    try {
      const q = query(collection(db, "users"), where("name", "==", userName));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        setVisitedUser({ id: docSnap.id, ...docSnap.data() });
      } else {
        // Fallback placeholder profile
        setVisitedUser({
          name: userName,
          level: UserLevel.BRONZE,
          levelProgress: 15,
          walletBalance: 250,
          photoUrl: "",
          age: "",
          gender: "",
          address: "",
          location: "অনলাইন আড্ডাঘর // Stream Guest",
          lastActive: Date.now(),
          isGuest: true,
        });
      }
    } catch (e) {
      console.error("Error looking up user:", e);
    } finally {
      setIsSearchingUser(false);
    }
  };

  // Trigger floating reaction physics (Sends to Firestore for all users!)
  const handleAddReaction = async (icon: string) => {
    if (!activeRoomId) return;
    const reactionData = {
      icon,
      x: 35 + Math.random() * 30, // center drift (35% to 65%)
      y: 90,
      scale: 0.8 + Math.random() * 0.7,
      createdAt: Date.now(),
    };

    try {
      await addDoc(collection(db, "rooms", activeRoomId, "reactions"), reactionData);
    } catch (err) {
      console.error("Firestore add reaction error:", err);
    }
  };

  // Multiple burst reaction trigger for gifts
  const triggerBurstInFirestore = async (icon: string, count: number) => {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        handleAddReaction(icon);
      }, i * 200);
    }
  };

  // Post user message & grant XP
  const handleSendMessage = async (text: string) => {
    if (!activeRoomId) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userMsg = {
      user: userProfile.name,
      message: text,
      timestamp,
      level: userProfile.level,
      levelColor: "#d2bbff",
      avatarColor: userProfile.avatarColor || "#d2bbff",
      photoUrl: userProfile.photoUrl || "",
      isGift: false,
      createdAt: Date.now(),
    };

    try {
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), userMsg);
      await handleAddReaction("❤️");
      grantXP(6);
    } catch (err) {
      console.error("Firestore post user message error:", err);
    }
  };

  // Determine user status class tier based on Level Number
  const getLevelTier = (levelNum: number): UserLevel => {
    if (levelNum >= 51) return UserLevel.LEGENDARY;
    if (levelNum >= 31) return UserLevel.PLATINUM;
    if (levelNum >= 16) return UserLevel.GOLD;
    if (levelNum >= 6) return UserLevel.SILVER;
    return UserLevel.BRONZE;
  };

  // Gifting Trigger from Spectator Dashboard
  const handleSendGift = async (gift: GiftItem, targetId?: string, targetName?: string) => {
    if (!activeRoomId) return;
    
    let currentBalance = userProfile.walletBalance;
    
    // 1. Deduct wallet balance
    if (currentBalance < gift.cost) {
      alert(language === "BN" ? "কয়েন ব্যালেন্স পর্যাপ্ত নয়! অনুগ্রহ করে কয়েন টপ-আপ করুন।" : "Insufficient Stars balance! Please top up your Stars.");
      return;
    }

    // Find recipient details from our online users or use fallbacks
    const searchId = (targetId || "").trim().toLowerCase();
    const recipientUser = onlineUsers.find(
      (u) => u.id === targetId || (u.customUserId && u.customUserId.toLowerCase() === searchId) || u.name.toLowerCase() === searchId
    );

    const finalRecipientUid = recipientUser ? recipientUser.id : (targetId || "host");
    const finalRecipientName = recipientUser ? recipientUser.name : (targetName || targetId || "হোস্ট");

    setUserProfile((prev) => ({
      ...prev,
      walletBalance: prev.walletBalance - gift.cost,
    }));

    // Update sender balance in Firestore
    if (userId) {
      updateDoc(doc(db, "users", userId), {
        walletBalance: increment(-gift.cost)
      }).catch(err => console.error("Error updating sender balance:", err));
    }

    // 2. Prepare message
    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const giftMsg = {
      user: userProfile.name,
      message: `${finalRecipientName}-কে উপহার দিয়েছেন / sent to @${finalRecipientName}! 🎉`,
      timestamp,
      level: userProfile.level,
      levelColor: "#ffb2b7",
      avatarColor: userProfile.avatarColor || "#d2bbff",
      photoUrl: userProfile.photoUrl || "",
      isGift: true,
      giftIcon: gift.icon,
      giftName: gift.name,
      giftValue: gift.cost,
      createdAt: Date.now(),
    };

    try {
      // Add message to Firestore
      await addDoc(collection(db, "rooms", activeRoomId, "messages"), giftMsg);

      // Increment stats in Firestore (viewer count will be incremented dynamically by listeners)
      await updateDoc(doc(db, "rooms", activeRoomId), {
        likeCount: increment(gift.cost * 12),
      });

      // Trigger burst reactions for everyone
      await triggerBurstInFirestore(gift.icon, gift.cost >= 200 ? 12 : 6);

      // Update recipient's profile stats in Firestore!
      if (finalRecipientUid && finalRecipientUid !== "host") {
        const recipientRef = doc(db, "users", finalRecipientUid);
        await setDoc(recipientRef, {
          receivedGiftsCount: increment(1),
          receivedGiftsValue: increment(gift.cost),
          // Store the last received gift
          lastReceivedGift: {
            icon: gift.icon,
            name: gift.name,
            sender: userProfile.name,
            timestamp: Date.now()
          }
        }, { merge: true });
      }

      // Grant experience to sender
      const xpGained = Math.max(12, Math.floor(gift.cost * 0.4));
      grantXP(xpGained);
    } catch (err) {
      console.error("Error sending gift:", err);
    }
  };

  // Experience level progression tracker
  const grantXP = (amount: number) => {
    setUserProfile((prev) => {
      const currentSp = prev.sp !== undefined ? prev.sp : 100;
      const nextSp = currentSp + amount;
      
      const currentLevelNum = Math.floor(currentSp / 200) + 1;
      const nextLevelNum = Math.floor(nextSp / 200) + 1;
      
      const nextProgressPercent = Math.floor(((nextSp % 200) / 200) * 100);
      const nextLevelTier = getLevelTier(nextLevelNum);
      
      const leveledUp = nextLevelNum > currentLevelNum;

      if (leveledUp) {
        // Trigger Level-Up Sound effect
        playChimeFanfare();
        // Trigger banner alert
        setShowLevelUpAlert(`LEVEL ${nextLevelNum} (${nextLevelTier})`);
      }

      const updated = {
        ...prev,
        sp: nextSp,
        level: nextLevelTier,
        levelProgress: nextProgressPercent,
      };

      // Also persist to Firestore immediately if logged in
      if (userId) {
        const userDocRef = doc(db, "users", userId);
        setDoc(userDocRef, {
          sp: nextSp,
          level: nextLevelTier,
          levelProgress: nextProgressPercent
        }, { merge: true }).catch(err => console.error("Error updating XP in Firestore:", err));
      }

      return updated;
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

  // Topup Wallet balance (Interceded to open the Recharge packages selection list)
  const handleTopupWallet = (amount?: number) => {
    setIsRechargeModalOpen(true);
  };

  const handleRequestRecharge = async (amount: number, price: number, senderNumber: string, method: string) => {
    setIsSubmittingRecharge(true);
    setRechargeSuccessMessage("");
    try {
      const reqId = "req_" + Math.random().toString(36).substring(2, 11);
      const reqDocRef = doc(db, "recharge_requests", reqId);
      
      const coinsAmount = amount;
      const bdtPrice = price;

      await setDoc(reqDocRef, {
        id: reqId,
        userId: userId,
        userName: userProfile.name,
        avatarColor: userProfile.avatarColor || "#89ceff",
        amount: coinsAmount,
        pricePaid: bdtPrice,
        senderNumber: senderNumber,
        paymentMethod: method,
        status: "pending",
        createdAt: Date.now(),
      });
      
      setRechargeSuccessMessage(`আপনার অনুরোধটি সফলভাবে সাবমিট করা হয়েছে। অনুগ্রহ করে অপেক্ষা করুন, ২-৫ মিনিটের মধ্যে আপনার একাউন্টে ${coinsAmount} কয়েন যোগ হয়ে যাবে ইনশাআল্লাহ।`);
      setSelectedPackageForPayment(null);
      setSenderPhoneNumber("");
    } catch (e) {
      console.error("Recharge request submission failed:", e);
      alert("অনুরোধ পাঠাতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
    } finally {
      setIsSubmittingRecharge(false);
    }
  };

  const handleApproveRecharge = async (req: any) => {
    try {
      // 1. Update status to approved
      const reqDocRef = doc(db, "recharge_requests", req.id);
      await setDoc(reqDocRef, { status: "approved" }, { merge: true });

      // 2. Increment walletBalance in user doc inside a transaction
      const userDocRef = doc(db, "users", req.userId);
      await runTransaction(db, async (transaction) => {
        const userSnap = await transaction.get(userDocRef);
        if (!userSnap.exists()) {
          transaction.set(userDocRef, { walletBalance: req.amount }, { merge: true });
        } else {
          const currentBalance = userSnap.data().walletBalance || 0;
          transaction.update(userDocRef, { walletBalance: currentBalance + req.amount });
        }
      });

      alert(`সফলভাবে @${req.userName}-এর ${req.amount.toLocaleString()} Coins রিচার্জ অনুমোদন করা হয়েছে!`);
    } catch (e) {
      console.error("Error approving recharge:", e);
      alert("অনুমোদন ব্যর্থ হয়েছে।");
    }
  };

  const handleRejectRecharge = async (requestId: string) => {
    try {
      const reqDocRef = doc(db, "recharge_requests", requestId);
      await setDoc(reqDocRef, { status: "rejected" }, { merge: true });
      alert("অনুরোধটি বাতিল করা হয়েছে।");
    } catch (e) {
      console.error("Error rejecting recharge:", e);
      alert("বাতিল করতে ব্যর্থ হয়েছে।");
    }
  };

  // Save profile manually to local storage and Firestore
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    setSaveSuccessMessage("");
    try {
      localStorage.setItem("live_user_profile", JSON.stringify(userProfile));
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, {
        id: userId,
        name: userProfile.name,
        avatarColor: userProfile.avatarColor || "#89ceff",
        level: userProfile.level,
        levelProgress: userProfile.levelProgress,
        walletBalance: userProfile.walletBalance,
        photoUrl: userProfile.photoUrl || "",
        age: userProfile.age || "",
        gender: userProfile.gender || "",
        address: userProfile.address || "",
        location: userProfile.location || "",
        email: userProfile.email || "",
        phone: userProfile.phone || "",
        followedUsers: userProfile.followedUsers || [],
        friends: userProfile.friends || [],
        isAutoRechargeEnabled: userProfile.isAutoRechargeEnabled || false,
        lastActive: Date.now(),
      }, { merge: true });
      setSaveSuccessMessage("প্রোফাইল সফলভাবে সংরক্ষণ করা হয়েছে! / Profile saved successfully!");
      setTimeout(() => setSaveSuccessMessage(""), 4000);
    } catch (e: any) {
      console.error("Error saving profile:", e);
      alert("সংরক্ষণ করতে সমস্যা হয়েছে! " + e.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Toggle follow status of another user
  const handleToggleFollow = async (targetUserId: string) => {
    if (!userId) return;
    const isFollowing = userProfile.followedUsers?.includes(targetUserId);
    const updatedFollowed = isFollowing
      ? (userProfile.followedUsers || []).filter(id => id !== targetUserId)
      : [...(userProfile.followedUsers || []), targetUserId];

    const updatedProfile = { ...userProfile, followedUsers: updatedFollowed };
    setUserProfile(updatedProfile);
    localStorage.setItem("live_user_profile", JSON.stringify(updatedProfile));

    try {
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, { followedUsers: updatedFollowed }, { merge: true });
    } catch (e) {
      console.error("Error toggling follow:", e);
    }
  };

  // Toggle friend status of another user
  const handleToggleFriend = async (targetUserId: string) => {
    if (!userId) return;
    const isFriend = userProfile.friends?.includes(targetUserId);
    const updatedFriends = isFriend
      ? (userProfile.friends || []).filter(id => id !== targetUserId)
      : [...(userProfile.friends || []), targetUserId];

    const updatedProfile = { ...userProfile, friends: updatedFriends };
    setUserProfile(updatedProfile);
    localStorage.setItem("live_user_profile", JSON.stringify(updatedProfile));

    try {
      // 1. Update my friends list in Firestore
      const userDocRef = doc(db, "users", userId);
      await setDoc(userDocRef, { friends: updatedFriends }, { merge: true });

      // 2. Update target user's friends list to be mutual
      const targetDocRef = doc(db, "users", targetUserId);
      const targetSnap = await getDoc(targetDocRef);
      if (targetSnap.exists()) {
        const targetData = targetSnap.data();
        const targetFriends = targetData.friends || [];
        const updatedTargetFriends = isFriend
          ? targetFriends.filter((id: string) => id !== userId)
          : [...targetFriends.filter((id: string) => id !== userId), userId];
        await setDoc(targetDocRef, { friends: updatedTargetFriends }, { merge: true });
      }
    } catch (e) {
      console.error("Error toggling friend:", e);
    }
  };

  // Toggle webcam stream simulation state
  const handleToggleWebcam = () => {
    setIsWebcamActive((prev) => !prev);
  };

  // Submit lounge messages
  const handleSendLoungeMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loungeInput.trim()) return;

    const text = loungeInput;
    setLoungeInput("");

    const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const newMsg = {
      user: userProfile.name,
      message: text,
      timestamp,
      level: userProfile.level,
      levelColor: "#ccc3d8",
      avatarColor: userProfile.avatarColor || "#d2bbff",
      photoUrl: userProfile.photoUrl || "",
      isGift: false,
      createdAt: Date.now(),
    };

    try {
      await addDoc(collection(db, "global_messages"), newMsg);
      grantXP(5);
    } catch (err) {
      console.error("Error sending global lounge message:", err);
    }
  };

  // Filtered rooms for lobby grid
  const filteredRoomsForLobby = rooms.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(loungeSearchQuery.toLowerCase()) ||
      r.streamerName.toLowerCase().includes(loungeSearchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(loungeSearchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" ||
      r.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCategory;
  });

  if (isAuthLoading) {
    return (
      <div className="min-h-screen w-screen bg-[#0c0e17] flex flex-col items-center justify-center text-white font-sans p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_25px_rgba(124,58,237,0.6)] mx-auto animate-spin">
            <Radio className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-lg font-black tracking-tight uppercase text-purple-300">RAIHAN'S ENGLISH</h2>
          <p className="text-xs text-white/40 animate-pulse">লোড হচ্ছে, দয়া করে অপেক্ষা করুন...</p>
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="min-h-screen w-screen bg-[#07080d] flex items-center justify-center text-white font-sans p-4 relative overflow-y-auto">
        {/* Ambient background glows */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md bg-slate-950/80 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-[0_8px_32px_rgba(0,0,0,0.5)] space-y-6 relative z-10 my-8">
          
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.5)] mx-auto">
              <Radio className="w-7 h-7 text-white animate-pulse" />
            </div>
            <div>
              <h1 className="font-sans font-black text-xl text-white tracking-wide uppercase">
                RAIHAN'S ENGLISH
              </h1>
              <p className="text-[10px] font-mono font-bold text-cyan-400 tracking-widest uppercase">
                English Academy & Live Chat
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-4 text-center">
            <span className="text-xs font-bold text-purple-300 block mb-3">
              {authIsSignUp ? "নতুন অ্যাকাউন্ট তৈরি করুন" : "লগইন করে প্রবেশ করুন"}
            </span>
          </div>

          {/* Feedback Messages */}
          {authError && (
            <div className="p-3.5 rounded-xl bg-red-600/10 border border-red-500/20 text-red-200 text-xs font-bold leading-relaxed flex items-start gap-2">
              <span className="text-sm shrink-0">⚠️</span>
              <span>{authError}</span>
            </div>
          )}

          {authSuccess && (
            <div className="p-3.5 rounded-xl bg-green-600/10 border border-green-500/20 text-green-200 text-xs font-bold leading-relaxed flex items-start gap-2">
              <span className="text-sm shrink-0">✅</span>
              <span>{authSuccess}</span>
            </div>
          )}

          {/* 1. Google Direct Login */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmittingAuth}
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:from-purple-800 disabled:to-indigo-800 text-white font-black rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2.5 transition-all shadow-lg hover:shadow-purple-500/15 border border-purple-400/20"
          >
            <span className="text-sm">📧</span>
            <span>{isSubmittingAuth ? "অনুমোতি নেওয়া হচ্ছে..." : "সরাসরি গুগল/জিমেইল দিয়ে প্রবেশ করুন"}</span>
          </button>

          <div className="flex items-center gap-3 my-4 text-white/20 text-xs font-bold">
            <span className="h-[1px] bg-white/10 flex-1" />
            <span>অথবা</span>
            <span className="h-[1px] bg-white/10 flex-1" />
          </div>

          {/* 2. Custom Unified Login Form */}
          <form onSubmit={handleCustomLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider block">
                ইউজার আইডি / User ID
              </label>
              <input
                type="text"
                required
                placeholder="যেমন: raihan123"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                disabled={isSubmittingAuth}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder-white/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-wider block">
                পাসওয়ার্ড (কমপক্ষে ৬ সংখ্যা বা অক্ষর)
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="আপনার পাসওয়ার্ডটি দিন"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                disabled={isSubmittingAuth}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50 transition-all placeholder-white/20"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmittingAuth}
              className="w-full py-3 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-950 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
            >
              <span>{isSubmittingAuth ? "অপেক্ষা করুন..." : "লগইন / নতুন অ্যাকাউন্ট তৈরি করুন"}</span>
            </button>
          </form>

          <p className="text-[10px] text-center text-white/40 leading-relaxed font-semibold">
            * আইডি পাসওয়ার্ড আগে থাকলে লগইন হবে, না থাকলে নতুন অ্যাকাউন্ট তৈরি হয়ে যাবে। জিমেইল বা ফোন নাম্বার প্রোফাইল এডিটে গিয়ে বসাতে পারবেন।
          </p>

          <div className="text-center pt-4 border-t border-white/5">
            <p className="text-[9px] text-white/30 font-mono">
              🔒 SSL Encrypted & Secured by Firebase
            </p>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-[#0c0e17] text-[#e1e1ef] font-sans overflow-hidden select-none" id="app-viewport">
      
      {/* 1. Header row with brand branding and stats */}
      <header className="h-16 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between bg-slate-950/60 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-[0_0_12px_rgba(124,58,237,0.4)] shrink-0">
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="font-sans font-black text-xs sm:text-base text-white tracking-wide truncate">
              {language === "BN" ? "রায়হান'স ইংলিশ একাডেমি" : "Raihan's English Academy"}
            </h1>
            <p className="text-[8px] font-mono font-bold text-cyan-400 tracking-widest uppercase">
              {activeTab === "creative"
                ? (language === "BN" ? "Studio // সম্প্রচার" : "Studio // Broadcast")
                : activeTab === "all-chat"
                ? (language === "BN" ? "Global // আড্ডা" : "Global // Hangout")
                : activeTab === "users"
                ? (language === "BN" ? "Active Members // সক্রিয়" : "Active Members // Online")
                : activeTab === "profile"
                ? (language === "BN" ? "ID Setup // প্রোফাইল" : "ID Setup // Profile")
                : activeRoom
                ? `Active Stream // ${activeRoom.streamerName}`
                : (language === "BN" ? "Real-Time Lobby // লবি" : "Real-Time Lobby // Lounge")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3.5">
          {/* Language Mode Toggle */}
          <button
            onClick={() => {
              const nextLang = language === "BN" ? "EN" : "BN";
              setLanguage(nextLang);
              alert(nextLang === "BN" ? "বাংলা ভাষা মোড চালু করা হয়েছে!" : "English language mode activated!");
            }}
            className="px-2.5 py-1 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 hover:text-white border border-pink-500/30 transition-all text-[10px] font-black flex items-center gap-1 shrink-0 rounded-xl"
          >
            <span>🌐</span>
            <span>{language === "BN" ? "English" : "বাংলা"}</span>
          </button>

          {/* Stats Bar */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1 text-[11px] text-yellow-400 font-extrabold font-mono">
            <span>✨ {userProfile.walletBalance}</span>
          </div>

          <div className="hidden xs:flex items-center gap-1.5 bg-white/5 border border-white/5 rounded-xl px-2.5 py-1 text-[10px] text-purple-300 font-extrabold font-mono uppercase">
            <span>{userProfile.level}</span>
          </div>

          <button
            onClick={() => setShowWelcomeTip(true)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white transition-all text-xs flex items-center gap-1.5 border border-white/5"
            aria-label="User Guide"
          >
            <Info className="w-3.5 h-3.5" />
            <span className="hidden md:inline text-[11px] font-bold">নির্দেশিকা</span>
          </button>
        </div>
      </header>

      {/* 2. Central Active View Container */}
      <div className="flex-1 flex flex-col h-full bg-[#11131c] relative min-w-0 pb-16 overflow-hidden">

        {/* Dynamic Tab Renderer */}
        {activeTab === "creative" ? (
          /* A. Creator Mode Interface */
          <CreatorView
            userId={userId}
            userProfile={userProfile}
            floatingReactions={floatingReactions}
            onAddReaction={handleAddReaction}
            isWebcamActive={isWebcamActive}
            onToggleWebcam={handleToggleWebcam}
          />
        ) : activeTab === "all-chat" ? (
          /* B. Global Lounge Chatroom */
          <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-hidden min-h-0 bg-[#0d0f19]">
            <div className="mb-4">
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-indigo-400" />
                <span>গ্লোবাল আড্ডা কক্ষ / Global Lounge Chatroom</span>
              </h2>
              <p className="text-xs text-white/50 mt-0.5">সব রিয়েল-টাইম ইউজারদের সাথে একসাথে আড্ডা দিন। কোনো রোবট আইডি নেই!</p>
            </div>

            <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col overflow-hidden min-h-0">
              {/* Message Log */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loungeMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-white/30">
                    <MessageSquare className="w-10 h-10 mb-2 opacity-45 text-indigo-500 animate-pulse" />
                    <p className="text-xs font-bold">আড্ডায় এখনো কোনো মেসেজ নেই</p>
                    <p className="text-[10px] mt-1">প্রথম মেসেজটি পাঠিয়ে আড্ডা শুরু করুন!</p>
                  </div>
                ) : (
                  loungeMessages.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => handleUserClick(msg.user)}
                      className="flex items-start gap-2.5 text-xs animate-fade-in max-w-2xl bg-white/5 p-2.5 rounded-xl border border-white/5 hover:border-indigo-500/30 hover:bg-white/10 cursor-pointer transition-all duration-200"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 border overflow-hidden bg-slate-900" style={{ borderColor: msg.avatarColor || '#ccc' }}>
                        {msg.photoUrl ? (
                          <img src={msg.photoUrl} alt={msg.user} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          msg.user.substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <span className="font-extrabold text-white" style={{ color: msg.avatarColor }}>
                            {msg.user}
                          </span>
                          <span className="text-[8px] font-mono px-1 rounded bg-slate-800 text-slate-300">
                            {msg.level}
                          </span>
                          <span className="text-[9px] text-white/30 font-mono ml-auto">{msg.timestamp}</span>
                        </div>
                        <p className="text-white/80 mt-1 select-text break-words leading-relaxed">{msg.message}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input Form */}
              <form onSubmit={handleSendLoungeMessage} className="p-4 border-t border-white/10 bg-slate-950/70 flex gap-2">
                <input
                  type="text"
                  placeholder="এখানে আপনার মেসেজ লিখুন..."
                  value={loungeInput}
                  onChange={(e) => setLoungeInput(e.target.value)}
                  className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-indigo-500/50 transition-all"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-[0_0_12px_rgba(99,102,241,0.25)] transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>পাঠান</span>
                </button>
              </form>
            </div>
          </div>
        ) : activeTab === "users" ? (
          /* B2. All Active Users Directory */
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#0d0f19]">
            <div className="max-w-4xl mx-auto space-y-6 pb-12">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  <span>সক্রিয় মেম্বারদের তালিকা / Active Members Directory</span>
                </h2>
                <p className="text-xs text-white/50 mt-0.5">সব রিয়েল মেম্বার এবং বন্ধুদের দেখুন। কোনো রোবট আইডি নেই!</p>
              </div>

              <div className="bg-slate-950/40 border border-white/5 rounded-2xl p-5 space-y-5">
                {/* Inner Search Box */}
                <div className="relative">
                  <Search className="absolute left-3.5 top-3 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    placeholder="সদস্যের নাম বা ইউজার আইডি দিয়ে খুঁজুন..."
                    value={loungeSearchQuery}
                    onChange={(e) => setLoungeSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-cyan-500/50 transition-all"
                  />
                </div>

                {/* Members Grid */}
                {onlineUsers.filter((u) => u.name.toLowerCase().includes(loungeSearchQuery.toLowerCase())).length === 0 ? (
                  <div className="text-center py-12 text-white/30">
                    <Users className="w-10 h-10 mx-auto mb-2 opacity-30 text-cyan-500" />
                    <p className="text-xs font-bold">কোনো সক্রিয় মেম্বার পাওয়া যায়নি</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {onlineUsers
                      .filter((u) => u.name.toLowerCase().includes(loungeSearchQuery.toLowerCase()))
                      .map((usr) => {
                        // Active in last 5 minutes
                        const isActiveNow = Date.now() - usr.lastActive < 300000;
                        return (
                          <div
                            key={usr.id}
                            onClick={() => setVisitedUser(usr)}
                            className="bg-white/5 border border-white/5 rounded-xl p-3.5 flex items-center gap-3 hover:border-cyan-500/30 hover:bg-slate-900/60 hover:scale-[1.02] cursor-pointer transition-all duration-200"
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0 border-2 overflow-hidden bg-slate-900"
                              style={{ borderColor: usr.avatarColor || "#fff", boxShadow: `0 0 10px ${usr.avatarColor || "#fff"}20` }}
                            >
                              {usr.photoUrl ? (
                                <img src={usr.photoUrl} alt={usr.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                usr.name.substring(0, 2).toUpperCase()
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="font-extrabold text-xs text-white flex items-center gap-1 truncate">
                                <span style={{ color: usr.avatarColor }}>{usr.name}</span>
                                {usr.id === userId && (
                                  <span className="text-[8px] bg-cyan-950 text-cyan-300 px-1 rounded font-bold uppercase">You</span>
                                )}
                              </div>
                              <p className="text-[9px] text-white/40 mt-0.5 font-mono font-bold">{usr.level} Class</p>
                            </div>
                            <div className="text-right shrink-0">
                              <span className={`inline-block w-2 h-2 rounded-full ${isActiveNow ? "bg-green-500 shadow-[0_0_8px_#10b981]" : "bg-slate-600"}`} />
                              <p className="text-[8px] font-mono text-white/30 mt-0.5 font-bold">{isActiveNow ? "Active" : "Recent"}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : activeTab === "profile" ? (
          /* C. Elegant Profile Settings Dashboard */
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#0d0f19]">
            <div className="max-w-2xl mx-auto space-y-6">
              <div>
                <h2 className="text-lg font-black text-white flex items-center gap-2">
                  <User className="w-5 h-5 text-pink-400" />
                  <span>প্রোফাইল সেটিংস ও অর্জনসমূহ / Profile & Statistics</span>
                </h2>
                <p className="text-xs text-white/50 mt-0.5">আপনার স্পেক্টেটর আইডি এবং গ্লোবাল লেভেল স্ট্যাটাস কাস্টমাইজ করুন</p>
              </div>

              <div className="bg-slate-950/40 border border-white/10 rounded-2xl p-5 space-y-6">
                {/* Visual Avatar Card */}
                <div className="flex flex-col sm:flex-row items-center gap-5 pb-5 border-b border-white/5">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black text-white border-2 shrink-0 shadow-lg overflow-hidden bg-slate-900" style={{ borderColor: userProfile.avatarColor, boxShadow: `0 0 15px ${userProfile.avatarColor}40` }}>
                    {userProfile.photoUrl ? (
                      <img src={userProfile.photoUrl} alt={userProfile.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      userProfile.name.substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="text-center sm:text-left space-y-1">
                    <div className="text-sm font-black text-white flex items-center justify-center sm:justify-start gap-2">
                      <span className="text-lg" style={{ color: userProfile.avatarColor }}>{userProfile.name}</span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-pink-950 text-pink-300 font-extrabold">
                        {userProfile.level}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">রিয়েল-টাইম আড্ডা মেম্বার // Atmospheric Server</p>
                  </div>
                </div>

                {/* Nickname Editor */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                    স্পেক্টেটর ডাকনাম / Nickname
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, name: e.target.value }))}
                      className="flex-1 bg-black/60 border border-white/10 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Nickname highlight color customizer */}
                <div className="space-y-2">
                  <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                    নামের গ্লো কালার / Avatar Highlight Color
                  </label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["#89ceff", "#ff89b4", "#b489ff", "#89ffd2", "#ffca89", "#ff8989"].map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setUserProfile(prev => ({ ...prev, avatarColor: color }))}
                        className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${userProfile.avatarColor === color ? "border-white scale-110" : "border-white/10"}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Select highlight color ${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Profile Photo URL Selector & Input */}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      প্রোফাইল ছবি লিংক / Profile Photo URL
                    </label>
                    <input
                      type="text"
                      value={userProfile.photoUrl || ""}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, photoUrl: e.target.value }))}
                      placeholder="পছন্দের ছবির লিংক পেস্ট করুন (Paste image URL)..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>

                  {/* Gallery File Upload */}
                  <div className="bg-white/5 border border-white/5 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-sans font-black text-pink-400">
                        📁 মোবাইল গ্যালারি / Device Gallery Upload
                      </span>
                      <span className="text-[9px] bg-pink-950 text-pink-300 font-extrabold px-1.5 py-0.5 rounded border border-pink-500/20">
                        মোবাইল গ্যালারি ছবি
                      </span>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-dashed border-white/20 flex items-center justify-center shrink-0 bg-slate-900">
                        {userProfile.photoUrl ? (
                          <img src={userProfile.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-5 h-5 text-white/30" />
                        )}
                      </div>
                      
                      <label className="flex-1 w-full sm:w-auto text-center px-4 py-2 bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/20 rounded-xl font-bold text-xs cursor-pointer transition-all duration-150 flex items-center justify-center gap-1.5">
                        <span>গ্যালারি থেকে ফটো দিন / Upload Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                alert("দুঃখিত, ফাইলের সাইজ ১০ মেগাবাইটের চেয়ে বড় হতে পারবে না!");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement("canvas");
                                  const MAX_WIDTH = 250;
                                  const MAX_HEIGHT = 250;
                                  let width = img.width;
                                  let height = img.height;

                                  if (width > height) {
                                    if (width > MAX_WIDTH) {
                                      height *= MAX_WIDTH / width;
                                      width = MAX_WIDTH;
                                    }
                                  } else {
                                    if (height > MAX_HEIGHT) {
                                      width *= MAX_HEIGHT / height;
                                      height = MAX_HEIGHT;
                                    }
                                  }

                                  canvas.width = width;
                                  canvas.height = height;
                                  const ctx = canvas.getContext("2d");
                                  if (ctx) {
                                    ctx.drawImage(img, 0, 0, width, height);
                                    const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
                                    setUserProfile(prev => ({ ...prev, photoUrl: dataUrl }));
                                  }
                                };
                                if (event.target?.result) {
                                  img.src = event.target.result as string;
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                  
                  {/* High quality quick selection presets */}
                  <div className="space-y-2">
                    <p className="text-[10px] text-white/30 font-bold">অথবা দ্রুত সেট করতে নিচের একটি এভাটার বেছে নিন:</p>
                    <div className="flex flex-wrap gap-2.5 pt-1">
                      {[
                        { name: "Cool Guy", url: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&auto=format&fit=crop&q=80" },
                        { name: "Cyber Girl", url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80" },
                        { name: "Neon Artist", url: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&auto=format&fit=crop&q=80" },
                        { name: "Cozy Writer", url: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&auto=format&fit=crop&q=80" },
                        { name: "Gamer Retro", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80" }
                      ].map((avatar) => (
                        <button
                          key={avatar.url}
                          type="button"
                          onClick={() => setUserProfile(prev => ({ ...prev, photoUrl: avatar.url }))}
                          className={`w-9 h-9 rounded-full overflow-hidden border-2 transition-all hover:scale-105 shrink-0 ${
                            userProfile.photoUrl === avatar.url ? "border-pink-500 shadow-md" : "border-white/10"
                          }`}
                        >
                          <img src={avatar.url} alt={avatar.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grid for Age & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Age Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      বয়স / Age
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={userProfile.age || ""}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, age: e.target.value }))}
                      placeholder="যেমন: ২৫"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>

                  {/* Gender Selector */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      লিঙ্গ / Gender
                    </label>
                    <div className="flex gap-2">
                      {[
                        { label: "ছেলে / Male", val: "Male" },
                        { label: "মেয়ে / Female", val: "Female" },
                        { label: "অন্যান্য / Other", val: "Other" }
                      ].map((item) => (
                        <button
                          type="button"
                          key={item.val}
                          onClick={() => setUserProfile(prev => ({ ...prev, gender: item.val }))}
                          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all border ${
                            userProfile.gender === item.val
                              ? "bg-pink-600/20 border-pink-500/50 text-pink-300 shadow-[0_0_10px_rgba(236,72,153,0.15)]"
                              : "bg-black/40 border-white/10 text-white/60 hover:text-white"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Grid for Address & Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Location Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      বর্তমান লোকেশন / City/Location
                    </label>
                    <input
                      type="text"
                      value={userProfile.location || ""}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, location: e.target.value }))}
                      placeholder="যেমন: ঢাকা, বাংলাদেশ"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>

                  {/* Address Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      ঠিকানা / Address
                    </label>
                    <input
                      type="text"
                      value={userProfile.address || ""}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="যেমন: গুলশান ১, ঢাকা"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Grid for Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Email Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      জিমেইল বা ইমেইল / Gmail or Email
                    </label>
                    <input
                      type="email"
                      value={userProfile.email || ""}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="যেমন: user@gmail.com"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>

                  {/* Phone Input */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-mono font-bold text-white/50 uppercase tracking-wider block">
                      ফোন নাম্বার / Phone Number
                    </label>
                    <input
                      type="tel"
                      value={userProfile.phone || ""}
                      onChange={(e) => setUserProfile(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="যেমন: 017XXXXXXXX"
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-pink-500/50 transition-all"
                    />
                  </div>
                </div>

                {/* Wallet balance display with topup */}
                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-amber-400 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">আপনার কয়েন ব্যালেন্স</h4>
                        <p className="text-lg font-mono font-black text-amber-400 mt-0.5">{userProfile.walletBalance} Coins</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setIsRechargeModalOpen(true)}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-400 hover:from-amber-400 hover:to-yellow-300 text-slate-950 font-black text-xs rounded-xl transition-all hover:scale-105 shadow-[0_0_15px_rgba(245,158,11,0.25)] flex items-center gap-1.5"
                      >
                        <Coins className="w-4 h-4 text-slate-950 animate-spin" style={{ animationDuration: "3s" }} />
                        <span>কয়েন রিচার্জ করুন / Recharge Coins</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Admin Mode Toggle and Panel */}
                <div className="border border-white/5 rounded-2xl p-4 bg-slate-950/40">
                  {!isAdminAuthorized ? (
                    /* Admin Login UI */
                    <form onSubmit={handleAdminLogin} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        <div>
                          <h4 className="text-xs font-black text-white">অ্যাডমিন কন্ট্রোল প্যানেল / Admin Mode</h4>
                          <p className="text-[10px] text-white/50">কন্ট্রোল প্যানেল অ্যাক্সেস করতে লগইন করুন</p>
                        </div>
                      </div>

                      {adminLoginError && (
                        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold text-center">
                          ⚠️ {adminLoginError}
                        </div>
                      )}

                      <div className="space-y-2.5">
                        <input
                          type="text"
                          placeholder="জিমেইল অথবা নাম্বার / Gmail or Phone"
                          value={adminLoginEmail}
                          onChange={(e) => setAdminLoginEmail(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-purple-500"
                        />
                        <input
                          type="password"
                          placeholder="পাসওয়ার্ড / Password"
                          value={adminLoginPassword}
                          onChange={(e) => setAdminLoginPassword(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-white/25 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-black text-xs rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.25)] transition-all"
                      >
                        লগইন করুন / Login Admin
                      </button>
                    </form>
                  ) : (
                    /* Admin Authorized Mode */
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-green-400" />
                          <div>
                            <h4 className="text-xs font-black text-white">অ্যাডমিন কন্ট্রোল / Admin Controls</h4>
                            <p className="text-[10px] text-emerald-400 font-semibold">লগইন আছেন / Authenticated</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => setIsAdminMode(!isAdminMode)}
                            className={`px-2.5 py-1 rounded-lg font-bold text-[10px] transition-all border ${
                              isAdminMode
                                ? "bg-purple-600/20 border-purple-500/40 text-purple-300"
                                : "bg-white/5 border-white/10 text-white/50"
                            }`}
                          >
                            {isAdminMode ? "অ্যাডমিন অন" : "অ্যাডমিন অফ"}
                          </button>
                          <button
                            type="button"
                            onClick={handleAdminLogout}
                            className="px-2.5 py-1 rounded-lg bg-red-950/40 hover:bg-red-950/70 border border-red-500/20 text-red-400 font-bold text-[10px] transition-all"
                          >
                            লগআউট
                          </button>
                        </div>
                      </div>

                      {isAdminMode && (
                        <div className="pt-3 border-t border-white/5 space-y-4">
                          {/* Inner Tabs */}
                          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 gap-1">
                            <button
                              type="button"
                              onClick={() => setAdminSubTab("requests")}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                adminSubTab === "requests"
                                  ? "bg-purple-600 text-white shadow-md"
                                  : "text-white/40 hover:text-white"
                              }`}
                            >
                              📥 রিচার্জ অনুরোধ ({rechargeRequests.filter(r => r.status === "pending").length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setAdminSubTab("packages")}
                              className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                                adminSubTab === "packages"
                                  ? "bg-purple-600 text-white shadow-md"
                                  : "text-white/40 hover:text-white"
                              }`}
                            >
                              ⚙️ কয়েন রেট এডিটর
                            </button>
                          </div>

                          {adminSubTab === "requests" ? (
                            /* Tab 1: Recharge Requests List */
                            <div className="space-y-3 animate-fade-in">
                              {rechargeRequests.filter(r => r.status === "pending").length === 0 ? (
                                <p className="text-xs text-white/40 italic py-3 text-center">কোনো পেন্ডিং রিচার্জ অনুরোধ নেই</p>
                              ) : (
                                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                  {rechargeRequests
                                    .filter(r => r.status === "pending")
                                    .map((req) => (
                                      <div key={req.id} className="p-3 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-3">
                                        <div className="space-y-1 min-w-0 flex-1">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: req.avatarColor || '#89ceff' }} />
                                            <span className="text-xs font-extrabold text-white truncate">{req.userName}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">ID: {req.userId?.substring(0,6)}</span>
                                          </div>
                                          <div className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                                            <span>🪙 {req.amount.toLocaleString()} Coins</span>
                                            <span className="text-[10px] font-normal text-white/40">// {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          </div>
                                          {req.senderNumber && (
                                            <div className="text-[11px] text-pink-400 font-mono mt-1 flex flex-col gap-0.5">
                                              <span>📱 {req.paymentMethod === 'bkash' ? 'bKash' : 'Nagad'}: {req.senderNumber}</span>
                                              {req.pricePaid && <span className="text-emerald-400 font-semibold">💰 Paid BDT: ৳{req.pricePaid}</span>}
                                            </div>
                                          )}
                                        </div>

                                        <div className="flex gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleRejectRecharge(req.id)}
                                            className="px-2.5 py-1.5 rounded-lg bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-500/20 font-bold text-[10px] transition-all"
                                          >
                                            বাতিল
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleApproveRecharge(req)}
                                            className="px-3 py-1.5 rounded-lg bg-green-500 hover:bg-green-400 text-slate-950 font-black text-[10px] shadow-[0_0_10px_rgba(34,197,94,0.2)] transition-all"
                                          >
                                            এপ্রুভ
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                </div>
                              )}

                              {rechargeRequests.filter(r => r.status !== "pending").length > 0 && (
                                <div className="mt-2 pt-2 border-t border-white/5">
                                  <details className="cursor-pointer group">
                                    <summary className="text-[10px] font-bold text-white/50 group-open:text-purple-400 hover:text-white transition-colors outline-none list-none flex items-center gap-1">
                                      <span>▶</span>
                                      <span>আগের রিচার্জ ইতিহাস / Completed Requests History</span>
                                    </summary>
                                    <div className="mt-2 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                      {rechargeRequests
                                        .filter(r => r.status !== "pending")
                                        .slice(0, 15)
                                        .map((req) => (
                                          <div key={req.id} className="p-2 rounded-lg bg-black/20 text-[11px] flex items-center justify-between text-white/60">
                                            <span className="font-medium">@{req.userName} ({req.amount.toLocaleString()} Coins)</span>
                                            <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                              req.status === 'approved' 
                                                ? 'bg-green-950 text-green-400 border border-green-500/20' 
                                                : 'bg-red-950 text-red-400 border border-red-500/20'
                                            }`}>
                                              {req.status === 'approved' ? 'Approved' : 'Rejected'}
                                            </span>
                                          </div>
                                        ))}
                                    </div>
                                  </details>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* Tab 2: Coin Rate & Packages Editor */
                            <div className="space-y-4 animate-fade-in text-xs text-white">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-bold text-purple-300">কয়েন রেট তালিকা / Active Rates:</span>
                                <button
                                  type="button"
                                  onClick={handleResetCoinPackages}
                                  className="text-[9px] font-bold bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-white/60 border border-white/10"
                                >
                                  রিসেট ডিফল্ট
                                </button>
                              </div>

                              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {coinPackages.map((pkg, idx) => {
                                  const isEditing = editingIndex === idx;
                                  return (
                                    <div key={pkg.amount} className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2.5">
                                      {isEditing ? (
                                        <div className="flex items-center gap-1.5 flex-1">
                                          <div className="flex-1 space-y-1">
                                            <span className="text-[9px] text-white/40 block">Coins:</span>
                                            <input
                                              type="number"
                                              value={editingAmount}
                                              onChange={(e) => setEditingAmount(e.target.value)}
                                              className="w-full bg-black/80 border border-white/15 rounded px-2 py-1 text-center font-bold text-amber-300 font-mono"
                                            />
                                          </div>
                                          <div className="flex-1 space-y-1">
                                            <span className="text-[9px] text-white/40 block">Taka (BDT):</span>
                                            <input
                                              type="number"
                                              value={editingPrice}
                                              onChange={(e) => setEditingPrice(e.target.value)}
                                              className="w-full bg-black/80 border border-white/15 rounded px-2 py-1 text-center font-bold text-emerald-400 font-mono"
                                            />
                                          </div>
                                          <div className="flex gap-1 shrink-0 self-end">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                handleUpdateCoinPackage(pkg.amount, parseInt(editingAmount), parseInt(editingPrice));
                                                setEditingIndex(null);
                                              }}
                                              className="p-1 rounded bg-green-500 text-slate-950 font-bold"
                                              title="Save"
                                            >
                                              <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingIndex(null)}
                                              className="p-1 rounded bg-white/10 text-white"
                                              title="Cancel"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <>
                                          <div className="flex-1 flex items-center justify-between">
                                            <span className="font-bold text-amber-300">🪙 {pkg.amount} Coins</span>
                                            <span className="font-bold text-emerald-400 font-mono">৳ {pkg.price} Taka</span>
                                          </div>
                                          <div className="flex gap-1">
                                            <button
                                              type="button"
                                              onClick={() => {
                                                setEditingIndex(idx);
                                                setEditingAmount(pkg.amount.toString());
                                                setEditingPrice(pkg.price.toString());
                                              }}
                                              className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-bold"
                                            >
                                              এডিট
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleDeleteCoinPackage(pkg.amount)}
                                              className="p-1 rounded hover:bg-red-950/40 text-red-400"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Add New Package Area */}
                              <div className="p-3 rounded-xl bg-purple-950/10 border border-purple-500/20 space-y-2.5">
                                <span className="text-[11px] font-bold text-purple-300 block">➕ নতুন প্যাকেজ যোগ করুন:</span>
                                <div className="grid grid-cols-2 gap-2">
                                  <input
                                    type="number"
                                    placeholder="কয়েন সংখ্যা / Coins"
                                    value={newPackageAmount}
                                    onChange={(e) => setNewPackageAmount(e.target.value)}
                                    className="bg-black/60 border border-white/10 rounded-lg p-2 text-center text-xs text-white"
                                  />
                                  <input
                                    type="number"
                                    placeholder="টাকা / Money"
                                    value={newPackagePrice}
                                    onChange={(e) => setNewPackagePrice(e.target.value)}
                                    className="bg-black/60 border border-white/10 rounded-lg p-2 text-center text-xs text-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={handleAddCoinPackage}
                                  className="w-full py-1.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg text-xs"
                                >
                                  প্যাকেজ যোগ করুন
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Experience progress bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white/60">পরবর্তী লেভেল প্রগ্রেস</span>
                    <span className="font-mono text-purple-400">{userProfile.levelProgress}% XP</span>
                  </div>
                  <div className="h-2.5 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                      style={{ width: `${userProfile.levelProgress}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-white/40">টিপস: যেকোনো আড্ডা রুমে মেসেজ বা গিফট পাঠালে আপনার প্রগ্রেস বৃদ্ধি পাবে!</p>
                </div>

                {/* Save Profile Button */}
                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  {saveSuccessMessage && (
                    <div className="p-3.5 bg-green-500/10 border border-green-500/30 rounded-xl text-green-300 text-xs font-bold text-center animate-pulse">
                      ✨ {saveSuccessMessage}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile}
                    className="w-full py-3.5 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white rounded-xl font-black text-xs shadow-[0_0_20px_rgba(236,72,153,0.25)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>প্রোফাইল সংরক্ষণ হচ্ছে... / Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>প্রোফাইল পরিবর্তন সংরক্ষণ করুন / Save Profile Changes</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full py-3.5 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl font-black text-xs border border-red-500/30 transition-all flex items-center justify-center gap-2 mt-1"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>লগআউট করুন / Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : !activeRoom ? (
          /* D. Gorgeous Lobby Grid when no active room is selected */
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-[#0b0c13]" id="lobby-directory">
            <div className="max-w-6xl mx-auto space-y-6">
              
              {/* Promo Banner Card with English Academy Branding */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-purple-900/30 via-slate-950 to-indigo-950/20 border border-purple-500/20 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_0_30px_rgba(168,85,247,0.15)]">
                <div className="absolute top-0 right-0 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl -z-10" />
                <div className="space-y-2 text-center md:text-left">
                  <div className="inline-flex items-center gap-1.5 bg-red-500/15 border border-red-500/30 px-2.5 py-1 rounded-full text-[10px] font-mono text-red-300 font-bold uppercase tracking-wider animate-pulse">
                    <Sparkles className="w-3 h-3" />
                    <span>{language === "BN" ? "🔴 লাইভ ইংলিশ একাডেমি" : "🔴 Live English Academy"}</span>
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                    {language === "BN" ? "রায়হান'স ইংলিশ একাডেমি" : "Raihan's English Academy"}
                  </h1>
                  <p className="text-xs text-white/60 max-w-xl leading-relaxed">
                    {language === "BN"
                      ? "এখানে শুধু ইংলিশে কনভারসেশন আড্ডা হবে। অন্য কোনো ভাষা বা অনাকাঙ্ক্ষিত কিছু করলে আইডি ব্যান খাওয়া হবে!"
                      : "Only English conversation & discussions are allowed here. Any other language or off-topic activities will result in an immediate account ban!"}
                  </p>
                </div>

                <div className="flex flex-col gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => handleTopupWallet(500)}
                    className="w-full sm:w-auto px-5 py-3 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white rounded-2xl font-bold text-xs shadow-[0_0_15px_rgba(236,72,153,0.3)] hover:scale-105 transition-all text-center"
                  >
                    🎁 {language === "BN" ? "দৈনিক ৫০০ বোনাস কয়েন দাবি করুন" : "Claim Daily 500 Coins Bonus"}
                  </button>
                  <div className="text-[10px] text-red-400 font-black text-center border border-red-500/30 bg-red-500/5 px-2.5 py-1 rounded-lg">
                    🚫 {language === "BN" ? "ভুল ভাষায় চ্যাট = আইডি ব্যান!" : "Wrong Language Chat = ID Ban!"}
                  </div>
                </div>
              </div>

              {/* Following, Friends & Fan Requests Section */}
              {(() => {
                const followedAndFriendUsers = onlineUsers.filter((u) => {
                  if (u.id === userId) return false;
                  const isFollowed = userProfile.followedUsers?.includes(u.id);
                  const isFriend = userProfile.friends?.includes(u.id);
                  return isFollowed || isFriend;
                });

                const fanUsers = onlineUsers.filter((u) => {
                  if (u.id === userId) return false;
                  // They followed us if our userId is in their followedUsers array
                  return u.followedUsers?.includes(userId);
                });

                // Fan requests are those who follow us but we don't follow back
                const newFanRequests = fanUsers.filter(
                  (u) => !userProfile.followedUsers?.includes(u.id)
                );

                return (
                  <div className="bg-slate-950/50 p-5 rounded-3xl border border-white/10 space-y-4">
                    {/* Section Tab Headers */}
                    <div className="flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex gap-2 p-1 bg-black/40 rounded-xl self-start">
                        <button
                          type="button"
                          onClick={() => setLobbySocialTab("following")}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            lobbySocialTab === "following"
                              ? "bg-purple-600/30 text-purple-200 shadow-sm"
                              : "text-white/40 hover:text-white"
                          }`}
                        >
                          ❤️ অনুসরণ ও বন্ধুরা ({followedAndFriendUsers.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setLobbySocialTab("fans")}
                          className={`relative px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                            lobbySocialTab === "fans"
                              ? "bg-pink-600/30 text-pink-200 shadow-sm"
                              : "text-white/40 hover:text-white"
                          }`}
                        >
                          <span>👥 ফ্যান রিকয়েস্ট ও অনুসারী ({fanUsers.length})</span>
                          {newFanRequests.length > 0 && (
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          )}
                        </button>
                      </div>

                      <span className="text-[10px] text-white/40 font-mono font-bold self-end xs:self-auto">
                        {lobbySocialTab === "following" ? "ট্যাপ করে প্রোফাইল দেখুন" : "ফলো করুন ও লাইভে যুক্ত হোন"}
                      </span>
                    </div>

                    {/* Tab 1 Content: Following & Friends */}
                    {lobbySocialTab === "following" && (
                      <div>
                        {followedAndFriendUsers.length > 0 ? (
                          <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                            {followedAndFriendUsers.map((friend) => {
                              const isOnline = Date.now() - (friend.lastActive || 0) < 180000; // Active within 3 minutes
                              const isMutFriend = userProfile.friends?.includes(friend.id);
                              
                              // Check if they have an active live stream
                              const liveRoom = rooms.find(
                                (r) => r.streamerId === friend.id || r.streamerName === friend.name
                              );

                              return (
                                <div
                                  key={friend.id}
                                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-black/40 hover:bg-white/5 border border-white/5 hover:border-pink-500/20 transition-all shrink-0 min-w-[90px] relative group"
                                >
                                  {liveRoom && (
                                    <span className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md bg-red-600 text-white text-[8px] font-black animate-pulse flex items-center gap-0.5 shadow-md">
                                      <span className="w-1 h-1 bg-white rounded-full block animate-ping" />
                                      LIVE
                                    </span>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => setVisitedUser(friend)}
                                    className="relative focus:outline-none"
                                  >
                                    <div
                                      className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white border-2 overflow-hidden bg-slate-900"
                                      style={{ borderColor: friend.avatarColor || "#89ceff" }}
                                    >
                                      {friend.photoUrl ? (
                                        <img src={friend.photoUrl} alt={friend.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        friend.name ? friend.name.substring(0, 2).toUpperCase() : "??"
                                      )}
                                    </div>
                                    <span className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${isOnline ? "bg-green-500 shadow-[0_0_8px_#22c55e]" : "bg-gray-500"}`} />
                                  </button>

                                  <div className="text-center max-w-[80px]">
                                    <p className="text-[11px] font-black text-white/90 truncate" style={{ color: friend.avatarColor || "#fff" }}>
                                      {friend.name}
                                    </p>
                                    <span className="text-[8px] font-mono font-bold text-pink-400 block mt-0.5">
                                      {isMutFriend ? "🤝 বন্ধু / Friend" : "❤️ ফলো / Followed"}
                                    </span>
                                  </div>

                                  {/* Quick Join live board button if they are live */}
                                  {liveRoom && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveRoomId(liveRoom.id);
                                        setActiveTab("home");
                                        alert(`${friend.name}-এর লাইভ বোর্ডে প্রবেশ করা হচ্ছে!`);
                                      }}
                                      className="mt-1 w-full py-1 bg-red-600 hover:bg-red-500 text-white font-black text-[9px] rounded-lg transition-colors flex items-center justify-center gap-0.5 shadow-md"
                                    >
                                      <span>বোর্ডে যান ➔</span>
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-white/30 space-y-1">
                            <p className="text-xs italic">আপনি এখনো কাউকে অনুসরণ বা বন্ধু করেননি।</p>
                            <p className="text-[10px] text-pink-400/60 font-semibold">
                              💡 টিপস: রুমে আড্ডা দেওয়ার সময় মেম্বারদের ছবিতে ক্লিক করে "ফলো করুন" বা "ফ্রেন্ড হোন"!
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Tab 2 Content: Fan Requests & Followers */}
                    {lobbySocialTab === "fans" && (
                      <div className="space-y-3">
                        <div className="p-3 bg-purple-950/25 border border-purple-500/20 rounded-2xl text-xs text-purple-300 leading-relaxed">
                          📌 <strong>ফ্যান রিকয়েস্ট কী?</strong> যখন অন্য কোনো মেম্বার আপনাকে আড্ডা রুমে বা প্রোফাইল থেকে ফলো করে, তখন সে আপনার অনুসারী বা ফ্যান হয়ে যায়। তাকে আপনিও অনুসরণ (Follow Back) করলে আপনারা পারস্পরিক 🤝 বন্ধু হয়ে যাবেন! সে লাইভ থাকলে সরাসরি তার লাইভ বোর্ডেও যেতে পারবেন।
                        </div>

                        {fanUsers.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {fanUsers.map((fan) => {
                              const isFollowingBack = userProfile.followedUsers?.includes(fan.id);
                              const isOnline = Date.now() - (fan.lastActive || 0) < 180000;
                              
                              // Check if this fan is currently live streaming
                              const liveRoom = rooms.find(
                                (r) => r.streamerId === fan.id || r.streamerName === fan.name
                              );

                              return (
                                <div
                                  key={fan.id}
                                  className="p-3 bg-black/40 border border-white/5 hover:border-pink-500/20 rounded-2xl flex items-center justify-between gap-3 transition-all"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="relative shrink-0">
                                      <div
                                        onClick={() => setVisitedUser(fan)}
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white border-2 overflow-hidden bg-slate-900 cursor-pointer"
                                        style={{ borderColor: fan.avatarColor || "#89ceff" }}
                                      >
                                        {fan.photoUrl ? (
                                          <img src={fan.photoUrl} alt={fan.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                        ) : (
                                          fan.name ? fan.name.substring(0, 2).toUpperCase() : "??"
                                        )}
                                      </div>
                                      <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-slate-950 ${isOnline ? "bg-green-500" : "bg-gray-500"}`} />
                                    </div>

                                    <div className="min-w-0">
                                      <h4
                                        onClick={() => setVisitedUser(fan)}
                                        className="text-xs font-black text-white hover:underline cursor-pointer truncate"
                                        style={{ color: fan.avatarColor }}
                                      >
                                        {fan.name}
                                      </h4>
                                      <p className="text-[9px] text-white/50 font-semibold mt-0.5 flex items-center gap-1.5">
                                        <span>LV {fan.level || "BRONZE"}</span>
                                        <span>•</span>
                                        <span className={isFollowingBack ? "text-teal-400 font-bold" : "text-pink-400 font-bold animate-pulse"}>
                                          {isFollowingBack ? "🤝 বন্ধু / Mutual" : "💖 নতুন ফ্যান রিকয়েস্ট"}
                                        </span>
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex flex-col gap-1 items-end shrink-0">
                                    {/* Follow Back button if not following back yet */}
                                    {!isFollowingBack ? (
                                      <button
                                        type="button"
                                        onClick={() => handleToggleFollow(fan.id)}
                                        className="px-2.5 py-1 bg-pink-600 hover:bg-pink-500 text-white font-extrabold text-[10px] rounded-lg shadow-md transition-all flex items-center gap-1"
                                      >
                                        <span>💖 ফলো ব্যাক</span>
                                      </button>
                                    ) : (
                                      <span className="text-[9px] bg-teal-950/40 text-teal-300 px-1.5 py-0.5 rounded border border-teal-500/20 font-bold">
                                        🤝 সংযুক্ত
                                      </span>
                                    )}

                                    {/* Direct jump to live room if they are streaming */}
                                    {liveRoom ? (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setActiveRoomId(liveRoom.id);
                                          setActiveTab("home");
                                          alert(`${fan.name}-এর লাইভ বোর্ডে নিয়ে যাওয়া হচ্ছে!`);
                                        }}
                                        className="px-2 py-1 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white font-black text-[9px] rounded-lg transition-all flex items-center gap-0.5 animate-bounce shadow-md"
                                      >
                                        <span className="w-1 h-1 bg-white rounded-full block animate-ping" />
                                        <span>বোর্ডে যান ➔</span>
                                      </button>
                                    ) : (
                                      <span className="text-[9px] text-white/30 font-medium font-mono">অফ-লাইভ</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-white/30 space-y-1">
                            <p className="text-xs font-bold">এখনো কোনো ফ্যান রিকয়েস্ট বা অনুসারী নেই।</p>
                            <p className="text-[10px]">আড্ডাঘরে সময় কাটান ও অন্য মেম্বারদের ফলো করতে উৎসাহিত করুন!</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Filtering & Search Row */}
              <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-950/40 p-3 rounded-2xl border border-white/5">
                {/* Category Chips */}
                <div className="flex gap-1.5 overflow-x-auto w-full sm:w-auto pb-1.5 sm:pb-0">
                  {["all", "music", "vibe", "asmr", "cyber"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border shrink-0 ${
                        selectedCategory === cat
                          ? "bg-purple-600/20 text-purple-200 border-purple-500/30"
                          : "bg-transparent text-white/50 border-transparent hover:text-white"
                      }`}
                    >
                      {cat === "all" ? "সব রুম" : cat}
                    </button>
                  ))}
                </div>

                {/* Inner Search Box */}
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-white/40" />
                  <input
                    type="text"
                    placeholder="রুমের নাম বা স্ট্রিমার খুঁজুন..."
                    value={loungeSearchQuery}
                    onChange={(e) => setLoungeSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-black/60 border border-white/10 rounded-xl text-xs text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Layout & Compact Controls Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-950/20 px-4 py-2 rounded-xl border border-white/5 text-[11px]">
                <div className="flex items-center gap-1.5 text-white/60">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span>বর্তমানে {filteredRoomsForLobby.length}টি রুম লাইভ আড্ডায় রয়েছে</span>
                </div>
                
                {/* Column adjustment selector */}
                <div className="flex items-center gap-2">
                  <span className="text-white/40 font-bold uppercase tracking-wider text-[9px]">সিরিয়ালে রুম সংখ্যা / View Columns:</span>
                  <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5">
                    {[3, 4, 5, 6, 7].map((num) => (
                      <button
                        key={num}
                        onClick={() => setLobbyGridCols(num)}
                        className={`px-2 py-0.5 rounded-md font-bold text-xs transition-all ${
                          lobbyGridCols === num
                            ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-md scale-105"
                            : "text-white/50 hover:text-white hover:bg-white/5"
                        }`}
                      >
                        {num}টি
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lobby Live Grid */}
              {filteredRoomsForLobby.length === 0 ? (
                <div className="text-center py-16 px-6 bg-slate-950/40 rounded-3xl border border-white/5 max-w-xl mx-auto space-y-4">
                  <div className="w-16 h-16 bg-purple-600/15 border border-purple-500/30 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(147,51,234,0.15)]">
                    <Video className="w-7 h-7 text-purple-400 animate-pulse" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-base font-black text-white">বর্তমানে কোনো লাইভ আড্ডা রুম সক্রিয় নেই</h3>
                    <p className="text-xs text-white/50 leading-relaxed">
                      সব রবটিক এবং ফেক রুম সফলভাবে চিরতরে বন্ধ করা হয়েছে। আপনিই প্রথম রিয়েল লাইভ আড্ডা রুমটি চালু করতে নিচের <span className="text-purple-300 font-bold">"লাইভ রুম"</span> অপশনে চাপ দিন!
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveTab("creative");
                      setIsCreatorMode(true);
                    }}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-[0_0_15px_rgba(124,58,237,0.3)] transition-all animate-bounce"
                  >
                    আড্ডা রুম চালু করুন / Start Live Room
                  </button>
                </div>
              ) : (
                <div className={`grid ${gridColsClasses[lobbyGridCols] || gridColsClasses[5]} gap-4`}>
                  {filteredRoomsForLobby.map((rm) => (
                    <div
                      key={rm.id}
                      className="bg-slate-950/75 border border-white/10 rounded-xl p-3 flex flex-col justify-between hover:border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.15)] transition-all cursor-pointer relative group duration-200"
                      onClick={() => setActiveRoomId(rm.id)}
                    >
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[8px] uppercase font-mono font-black px-1.5 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-500/10">
                            {rm.category}
                          </span>
                          <span className="text-[8px] font-mono font-black text-red-400 flex items-center gap-1 bg-red-950/20 px-1.5 py-0.5 rounded border border-red-500/10">
                            <span className="w-1 h-1 rounded-full bg-red-500 animate-pulse" />
                            {rm.viewerCount} জন
                          </span>
                        </div>

                        <div>
                          <h3 className="font-sans font-black text-xs text-white group-hover:text-purple-300 transition-colors truncate" title={rm.title}>
                            {rm.title}
                          </h3>
                          <div className="flex items-center justify-between text-[9px] text-white/40 mt-0.5">
                            <span className="font-mono text-cyan-400 font-bold truncate max-w-[80px]">@{rm.streamerName}</span>
                            <span>❤️ {rm.likeCount.toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Real-time live comments under the room name */}
                        <div className="border-t border-white/5 pt-1.5">
                          <span className="text-[8px] font-bold text-white/30 uppercase tracking-wider block">রুম কমেন্ট / Live Comment:</span>
                          <RoomLatestComment roomId={rm.id} />
                        </div>
                      </div>

                      <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <img
                            referrerPolicy="no-referrer"
                            src={rm.streamerAvatar}
                            alt={rm.streamerName}
                            className="w-5 h-5 rounded-full object-cover border border-white/20 shrink-0"
                          />
                          <span className="text-[8px] font-black text-white/50 truncate">LV {rm.streamerLevelValue}</span>
                        </div>

                        <button className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold text-[9px] rounded-md transition-all shadow shrink-0">
                          যোগ দিন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* E. Spectator View Interface (Active Live Room View) */
          <div className="flex-1 flex flex-col xl:flex-row p-4 sm:p-6 gap-4 sm:gap-6 overflow-hidden min-h-0 relative" id="main-content-split">
            
            {/* Dynamic Floating Reactions from User Actions (floats beautifully over the whole room layout) */}
            <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
              {floatingReactions.map((reaction) => (
                <div
                  key={reaction.id}
                  className="absolute bottom-12 left-1/2 -translate-x-1/2 text-5xl"
                  style={{
                    left: `${reaction.x}%`,
                    transform: `scale(${reaction.scale})`,
                    opacity: 0.9,
                    animation: "floatUp 2.8s forwards ease-out",
                  }}
                >
                  {reaction.icon}
                </div>
              ))}
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex xl:hidden gap-1 bg-slate-950/40 p-1 rounded-xl border border-white/10 shrink-0">
              <button
                onClick={() => setActiveMobileTab("stream")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeMobileTab === "stream"
                    ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    : "text-white/60"
                }`}
              >
                🎙️ Voice Seats & Gifts
              </button>
              <button
                onClick={() => setActiveMobileTab("chat")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative ${
                  activeMobileTab === "chat"
                    ? "bg-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.3)]"
                    : "text-white/60"
                }`}
              >
                💬 Live Chat
              </button>
            </div>

            {/* Left Column: Player Stage & Gifting Dock */}
            <div className={`flex-1 flex flex-col gap-4 sm:gap-6 overflow-y-auto min-h-0 pr-1 ${
              activeMobileTab === "stream" ? "flex" : "hidden xl:flex"
            }`}>
              
              {/* Compact High-Fidelity Audio Broadcast Header (বড় ভিডিও বোর্ড ও ক্যামেরার বদলে চমৎকার স্ট্যাটাসবার) */}
              <div className="p-5 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 border border-white/10 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl relative overflow-hidden shrink-0">
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-600/5 rounded-full blur-3xl -z-10" />
                
                {/* CSS Soundwave and floating reactions Style overrides */}
                <style dangerouslySetInnerHTML={{__html: `
                  @keyframes soundwave {
                    0%, 100% { transform: scaleY(0.4); }
                    50% { transform: scaleY(1.3); }
                  }
                  .animate-soundwave-1 { animation: soundwave 0.8s infinite ease-in-out; }
                  .animate-soundwave-2 { animation: soundwave 0.5s infinite ease-in-out; }
                  .animate-soundwave-3 { animation: soundwave 0.7s infinite ease-in-out; }
                  .animate-soundwave-4 { animation: soundwave 0.6s infinite ease-in-out; }
                  
                  @keyframes floatUp {
                    0% {
                      transform: translateY(0) scale(0.8);
                      opacity: 0;
                    }
                    10% {
                      opacity: 0.9;
                    }
                    90% {
                      opacity: 0.7;
                    }
                    100% {
                      transform: translateY(-280px) scale(1.4);
                      opacity: 0;
                    }
                  }
                  @keyframes slideUpFade {
                    0% {
                      transform: translateY(15px);
                      opacity: 0;
                    }
                    100% {
                      transform: translateY(0);
                      opacity: 1;
                    }
                  }
                `}} />

                <div className="flex items-start gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 border border-purple-400/30 flex items-center justify-center text-xl font-black text-white shrink-0 shadow-md">
                    🎙️
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white font-mono text-[9px] font-extrabold flex items-center gap-1 shadow-[0_0_12px_rgba(239,68,68,0.4)] animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white block animate-ping" />
                        আড্ডা সরাসরি / LIVE
                      </span>
                      <span className="text-[10px] bg-purple-500/10 border border-purple-500/20 text-purple-300 font-extrabold px-2 py-0.5 rounded">
                        Category: {activeRoom.category || "General"}
                      </span>
                      
                      {/* CSS Soundwave Visualizer */}
                      <div className="flex items-center gap-0.5 h-3 ml-1">
                        <span className="w-[2px] h-1.5 bg-cyan-400 rounded-full animate-soundwave-1" />
                        <span className="w-[2px] h-3 bg-cyan-400 rounded-full animate-soundwave-2" />
                        <span className="w-[2px] h-2.5 bg-cyan-400 rounded-full animate-soundwave-3" />
                        <span className="w-[2px] h-1 bg-cyan-400 rounded-full animate-soundwave-4" />
                      </div>
                    </div>
                    
                    <h3 className="font-sans font-black text-base text-white mt-1.5 tracking-tight truncate">
                      {activeRoom.title}
                    </h3>
                    
                    <p className="text-[11px] text-white/50 mt-1 flex items-center gap-2 flex-wrap">
                      <span>Host: <strong className="text-purple-300">@{activeRoom.streamerName}</strong></span>
                      <span>•</span>
                      <span>Likes: <strong className="text-cyan-400 font-mono">{activeRoom.likeCount.toLocaleString()}</strong></span>
                      <span>•</span>
                      <span>Audience: <strong className="text-teal-400 font-mono">{activeRoom.viewerCount.toLocaleString()} watching</strong></span>
                    </p>
                  </div>
                </div>

                {/* EXIT / LEAVE ROOM BUTTON (Addresses 'একটা সাইটে ডুকলে বের হতে পারি না') */}
                <button
                  onClick={() => setActiveRoomId(null)}
                  className="px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-200 hover:text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 border border-red-500/30 transition-all shrink-0 shadow-lg hover:shadow-red-600/10"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>বের হন / Leave Room</span>
                </button>
              </div>

              {/* Real-time entering notification banner (নিছে উঠে দেখা যাবে) inside Room */}
              {activeEntryNotice && (
                <div className="animate-slide-up-fade" style={{ animation: "slideUpFade 0.3s ease-out" }}>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-teal-500/90 via-emerald-600/90 to-cyan-600/90 backdrop-blur-md px-4 py-2.5 rounded-xl border border-teal-400/30 text-white shadow-[0_4px_25px_rgba(16,185,129,0.35)] text-xs font-bold font-sans">
                    <span className="text-sm">👋</span>
                    <span>{activeEntryNotice}</span>
                  </div>
                </div>
              )}

              {/* 1-10 Audio Seats Section */}
              <MicSeatsGrid
                roomId={activeRoom.id}
                seats={activeRoom.seats}
                userId={userId}
                userProfile={userProfile}
                isHost={userId === activeRoom.streamerId || userProfile.name === activeRoom.streamerName}
                onSelectRecipient={(id, name) => {
                  setRecipientId(id);
                  setRecipientName(name);
                }}
              />

              {/* Upgrade Inline Live Comment Box for Board users */}
              <div className="bg-slate-900/80 backdrop-blur-md border border-purple-500/20 rounded-2xl p-5 flex flex-col gap-4 shadow-xl" id="board-quick-comments">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                    <span className="text-xs font-black text-white flex items-center gap-1.5 uppercase tracking-wider">
                      {language === "BN" ? "🔴 লাইভ কমেন্ট সেকশন" : "🔴 Live Comment Feed"}
                    </span>
                  </div>
                  <span className="text-[10px] text-pink-400 font-extrabold px-2 py-0.5 rounded bg-pink-500/10 border border-pink-500/20 uppercase tracking-widest animate-pulse">
                    {language === "BN" ? "আড্ডা রুম" : "Lounge"}
                  </span>
                </div>

                {/* STRICT ENGLISH-ONLY ACADEMY WARNING BANNER */}
                <div className="p-3.5 bg-red-600/10 border border-red-500/20 rounded-xl text-red-200 text-xs leading-relaxed flex items-start gap-2.5 shadow-inner">
                  <span className="text-sm shrink-0">⚠️</span>
                  <div className="space-y-0.5">
                    <p className="font-extrabold text-white text-xs">
                      {language === "BN" 
                        ? "রায়হান'স ইংলিশ একাডেমি - কঠোর নিয়মাবলী" 
                        : "Raihan's English Academy - Strict Policy"}
                    </p>
                    <p className="text-[11px] text-white/90 font-medium">
                      {language === "BN"
                        ? "এখানে শুধু ইংলিশে কনভারসেশন আড্ডা হবে। আউট কিছু করলে বা অন্য ভাষা ব্যবহার করলে আইডি চিরতরে ব্যান (Banned) করা হবে!"
                        : "Only conversational English is permitted in this room. Off-topic, spam, or other languages will result in an immediate and permanent ID ban!"}
                    </p>
                  </div>
                </div>
                
                {/* Full-featured scrollable live comment list */}
                <div className="space-y-2 bg-black/60 p-4 rounded-xl border border-white/5 h-64 overflow-y-auto flex flex-col scroll-smooth">
                  <div className="mt-auto space-y-2">
                    {messages.map((msg) => {
                      const isWarn = msg.user.includes("SYSTEM") || msg.user.includes("GUARD");
                      return (
                        <div 
                          key={msg.id} 
                          className={`text-xs p-2 rounded-lg transition-all ${
                            isWarn 
                              ? "bg-red-500/10 border border-red-500/30 text-red-200 animate-pulse" 
                              : "bg-white/5 hover:bg-white/10 text-white/90"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-1.5">
                              <span 
                                className="font-black text-cyan-300" 
                                style={{ color: msg.avatarColor || "#89ceff" }}
                              >
                                @{msg.user}
                              </span>
                              {msg.isSystem && (
                                <span className="text-[8px] font-black px-1 rounded bg-red-600 text-white uppercase tracking-wider">
                                  SYSTEM
                                </span>
                              )}
                              <span className="text-[8px] text-white/30 font-bold">{msg.level}</span>
                            </div>
                            <span className="text-[8px] text-white/30 font-mono">{msg.timestamp}</span>
                          </div>
                          <p className="text-[11px] leading-relaxed break-words">{msg.message}</p>
                        </div>
                      );
                    })}
                    {messages.length === 0 && (
                      <div className="text-center py-12 text-white/30 space-y-2">
                        <span className="text-2xl block">💬</span>
                        <p className="text-xs italic">
                          {language === "BN" 
                            ? "কোনো কমেন্ট নেই, ইংরেজিতে প্রথম কমেন্টটি আপনি করুন!" 
                            : "No comments yet, write the first comment in English!"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Direct quick comment input with English validation guard */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const input = form.elements.namedItem("quickComment") as HTMLInputElement;
                    if (input && input.value.trim()) {
                      const val = input.value.trim();
                      
                      // Check for Bengali letters (Unicode range \u0980 to \u09FF)
                      const hasBengali = /[\u0980-\u09FF]/.test(val);
                      if (hasBengali) {
                        alert(
                          language === "BN"
                            ? "❌ ভুল ভাষা! এখানে শুধু ইংলিশে আড্ডা দেওয়া যাবে। অন্য ভাষা ব্যবহার করলে আইডি ব্যান করা হবে!"
                            : "❌ Invalid Language! Only English conversation is allowed. Violating this will get your ID banned!"
                        );
                        // Post text anyway but generate an immediate automatic System Guard Warn
                        handleSendMessage(val);
                        setTimeout(() => {
                          const warningMsg: ChatMessage = {
                            id: `warn-${Date.now()}`,
                            user: "SYSTEM GUARD 🛡️",
                            message: `⚠️ STRICT VIOLATION NOTICE: @${userProfile.name} commented in a banned language. Only English is allowed in Raihan's English Academy. Continuous violations will result in permanent suspension!`,
                            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            avatarColor: "#f43f5e",
                            level: UserLevel.LEGENDARY,
                            levelColor: "#f43f5e",
                            isGift: false,
                            isSystem: true
                          };
                          setMessages(prev => [...prev, warningMsg]);
                        }, 500);
                      } else {
                        handleSendMessage(val);
                      }
                      input.value = "";
                    }
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    name="quickComment"
                    placeholder={
                      language === "BN" 
                        ? "ইংরেজি কনভারসেশন বা কমেন্ট লিখুন..." 
                        : "Type your English conversation comment..."
                    }
                    maxLength={150}
                    className="flex-1 bg-black/60 border border-white/10 focus:border-pink-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 outline-none transition-all focus:ring-1 focus:ring-pink-500 font-sans"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-rose-500 hover:from-pink-500 hover:to-rose-400 text-white rounded-xl font-bold text-xs shadow-md transition-all active:scale-95 shrink-0"
                  >
                    {language === "BN" ? "মন্তব্য" : "Comment"}
                  </button>
                </form>
              </div>

              {/* Gifting Interaction Panel */}
              <GiftingDock
                walletBalance={userProfile.walletBalance}
                onSendGift={handleSendGift}
                onTopupWallet={handleTopupWallet}
                roomSeats={activeRoom.seats}
                streamerName={activeRoom.streamerName}
                streamerId={activeRoom.streamerId}
                recipientId={recipientId}
                recipientName={recipientName}
                onSelectRecipient={(id, name) => {
                  setRecipientId(id);
                  setRecipientName(name);
                }}
                isAutoRechargeEnabled={userProfile.isAutoRechargeEnabled || false}
                onToggleAutoRecharge={(val) => {
                  setUserProfile(prev => ({ ...prev, isAutoRechargeEnabled: val }));
                  alert(val ? "অটো রিচার্জ চালু করা হয়েছে! (Auto-Recharge Activated)" : "অটো রিচার্জ বন্ধ করা হয়েছে! (Auto-Recharge Deactivated)");
                }}
                onlineUsers={onlineUsers}
              />
            </div>

            {/* Right Column: Chat panel */}
            <div className={`w-full xl:w-[360px] h-full flex flex-col shrink-0 overflow-hidden ${
              activeMobileTab === "chat" ? "flex" : "hidden xl:flex"
            }`}>
              <ChatPanel
                messages={messages}
                onSendMessage={handleSendMessage}
                userProfile={userProfile}
                chatSpeed={chatSpeed}
                onChangeSpeed={setChatSpeed}
                onUserClick={handleUserClick}
              />
            </div>
          </div>
        )}
      </div>

      {/* 3. High-Fidelity Fixed Bottom Navigation Bar (All buttons in one sequential line) */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#0a0b12]/95 backdrop-blur-md border-t border-white/10 flex items-center justify-around px-2 pb-safe z-40 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]">
        {/* BUTTON 1: HOME (হোম / লবি) */}
        <button
          id="btn-nav-home"
          onClick={() => {
            setActiveTab("home");
            setActiveRoomId(null);
            setIsCreatorMode(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
            activeTab === "home" && !activeRoomId
              ? "text-purple-400 bg-white/5"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-tight">হোম / Home</span>
        </button>

        {/* BUTTON 2: ALL USERS (অল ইউজার) */}
        <button
          id="btn-nav-users"
          onClick={() => {
            setActiveTab("users");
            setActiveRoomId(null);
            setIsCreatorMode(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
            activeTab === "users"
              ? "text-cyan-400 bg-white/5"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-tight">অল ইউজার</span>
        </button>

        {/* BUTTON 3: START LIVE (লাইভ রুম চালু) */}
        <button
          id="btn-nav-live"
          onClick={() => {
            setActiveTab("creative");
            setActiveRoomId(null);
            setIsCreatorMode(true);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
            activeTab === "creative"
              ? "text-red-400 bg-white/5"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <Video className="w-5 h-5 animate-pulse text-red-500" />
          <span className="text-[9px] font-bold tracking-tight">লাইভ রুম</span>
        </button>

        {/* BUTTON 4: CHAT WITH FRIENDS (বন্ধুদের চ্যাট) */}
        <button
          id="btn-nav-chat"
          onClick={() => {
            setActiveTab("all-chat");
            setActiveRoomId(null);
            setIsCreatorMode(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
            activeTab === "all-chat"
              ? "text-indigo-400 bg-white/5"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-tight">চ্যাট অপশন</span>
        </button>

        {/* BUTTON 5: PROFILE EDIT (প্রোফাইল এডিট) */}
        <button
          id="btn-nav-profile"
          onClick={() => {
            setActiveTab("profile");
            setActiveRoomId(null);
            setIsCreatorMode(false);
          }}
          className={`flex flex-col items-center justify-center gap-1 w-16 h-12 rounded-xl transition-all ${
            activeTab === "profile"
              ? "text-pink-400 bg-white/5"
              : "text-white/40 hover:text-white/80"
          }`}
        >
          <User className="w-5 h-5" />
          <span className="text-[9px] font-bold tracking-tight">প্রোফাইল</span>
        </button>
      </nav>

      {/* 4. Real-time Recharge Request Modal Overlay */}
      {isRechargeModalOpen && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="recharge-modal">
          <div className="bg-[#11131c] border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsRechargeModalOpen(false);
                setRechargeSuccessMessage("");
                setSelectedPackageForPayment(null);
                setSenderPhoneNumber("");
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
                <Coins className="w-5 h-5 text-amber-400 animate-bounce" />
              </div>
              <div>
                <h3 className="text-base font-sans font-black text-white">কয়েন রিচার্জ অনুরোধ / Coins Recharge</h3>
                <p className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider">ডাইনামিক প্যাকেজ সমূহ</p>
              </div>
            </div>

            {rechargeSuccessMessage && (
              <div className="mb-5 p-4 rounded-2xl bg-green-500/10 border border-green-500/30 text-green-300 text-xs font-bold animate-fade-in flex items-start gap-2.5">
                <span className="text-lg">✅</span>
                <p className="leading-relaxed">{rechargeSuccessMessage}</p>
              </div>
            )}

            {selectedPackageForPayment ? (
              /* Payment Step */
              <div className="space-y-5 animate-fade-in">
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-white/60">
                    <span>মনোনীত প্যাকেজ / Selected Package:</span>
                    <span className="text-white text-sm font-black">{selectedPackageForPayment.amount} Coins</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold text-white/60">
                    <span>মূল্য / Price:</span>
                    <span className="text-emerald-400 text-sm font-black">
                      ৳{selectedPackageForPayment.price} BDT
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-purple-950/20 border border-purple-500/20 space-y-3">
                  <p className="text-xs text-purple-200 font-bold leading-relaxed">
                    💸 রিচার্জ করতে নিচের <strong>বিকাশ</strong> অথবা <strong>নগদ</strong> নাম্বারে <span className="text-pink-400">৳{selectedPackageForPayment.price}</span> টাকা Send Money করুন:
                  </p>
                  <div className="bg-black/60 p-3.5 rounded-xl border border-white/5 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-[10px] text-white/40 block font-bold uppercase">BKASH / NAGAD (Personal)</span>
                      <span className="text-base font-mono font-black text-white select-all">01813845722</span>
                    </div>
                    <span className="text-[10px] font-black bg-pink-500/20 text-pink-300 border border-pink-500/30 px-2 py-1 rounded-md animate-pulse">
                      সক্রিয় / Active
                    </span>
                  </div>
                </div>

                {/* Sender Confirmation Fields */}
                <div className="space-y-3.5">
                  <div>
                    <label className="text-[11px] font-black text-white/70 uppercase block mb-1.5">
                      ১. পেমেন্ট মাধ্যম সিলেক্ট করুন / Select Payment Method:
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("bkash")}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                          paymentMethod === "bkash"
                            ? "bg-pink-600/20 border-pink-500 text-pink-300 font-black shadow-[0_0_15px_rgba(219,39,119,0.15)]"
                            : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <span className="text-base">📱</span> bKash / বিকাশ
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("nagad")}
                        className={`py-2 px-3 rounded-xl font-bold text-xs border transition-all flex items-center justify-center gap-2 ${
                          paymentMethod === "nagad"
                            ? "bg-orange-600/20 border-orange-500 text-orange-300 font-black shadow-[0_0_15px_rgba(249,115,22,0.15)]"
                            : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white"
                        }`}
                      >
                        <span className="text-base">🔥</span> Nagad / নগদ
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-black text-white/70 uppercase block mb-1.5">
                      ২. যে নাম্বার থেকে টাকা পাঠিয়েছেন (Sender Number):
                    </label>
                    <input
                      type="text"
                      maxLength={11}
                      placeholder="01xxxxxxxxx"
                      value={senderPhoneNumber}
                      onChange={(e) => setSenderPhoneNumber(e.target.value.replace(/\D/g, ""))}
                      className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white text-center focus:outline-none focus:border-amber-500 transition-all placeholder-white/20"
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPackageForPayment(null);
                      setSenderPhoneNumber("");
                    }}
                    className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-colors"
                  >
                    ⬅️ প্যাকেজে ফিরে যান / Back
                  </button>
                  <button
                    type="button"
                    disabled={isSubmittingRecharge || senderPhoneNumber.length < 11}
                    onClick={() => handleRequestRecharge(selectedPackageForPayment.amount, selectedPackageForPayment.price, senderPhoneNumber, paymentMethod)}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white rounded-xl text-xs font-black transition-all shadow-[0_0_15px_rgba(16,185,129,0.25)] disabled:opacity-40 disabled:pointer-events-none hover:scale-105"
                  >
                    {isSubmittingRecharge ? "অনুরোধ পাঠানো হচ্ছে..." : "কনফার্ম করুন / Confirm Request"}
                  </button>
                </div>
              </div>
            ) : (
              /* Package Selection List */
              <>
                <p className="text-xs text-white/60 mb-5 leading-relaxed">
                  আপনার অ্যাকাউন্টে কয়েন যোগ করতে নিচে থেকে যেকোনো প্যাকেজ বেছে নিয়ে ক্লিক করুন। ক্লিক করার পর পেমেন্ট নির্দেশনাবলী দেখতে পাবেন।
                </p>

                <div className="grid grid-cols-2 gap-3 mb-6 max-h-[280px] overflow-y-auto pr-1">
                  {coinPackages.map((pkg) => {
                    return (
                      <button
                        key={pkg.amount}
                        onClick={() => {
                          setRechargeSuccessMessage("");
                          setSelectedPackageForPayment(pkg);
                        }}
                        className="p-3.5 rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-amber-500/5 hover:border-amber-500/30 flex flex-col items-center justify-center gap-1 transition-all group cursor-pointer active:scale-95 text-center"
                      >
                        <span className="text-[9px] font-bold text-white/40 group-hover:text-amber-400 transition-colors uppercase tracking-wider">PACKAGE</span>
                        <span className="text-sm font-black text-white group-hover:text-amber-300 transition-colors">{pkg.amount} Coins</span>
                        <div className="text-[10px] font-mono font-extrabold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md mt-1 shrink-0 flex items-center gap-1">
                          <span>৳ {pkg.price} Taka</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => {
                      setIsRechargeModalOpen(false);
                      setRechargeSuccessMessage("");
                    }}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold border border-white/10 transition-colors"
                  >
                    বন্ধ করুন / Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 4. Global Informational Welcome Tutorial Modal */}
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

      {/* 5. Real-Time Searching/Loading Indicator for profile lookups */}
      {isSearchingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-6 flex flex-col items-center gap-3 shadow-2xl">
            <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-bold text-white/80">প্রোফাইল লোড হচ্ছে...</p>
          </div>
        </div>
      )}

      {/* 6. Visitor Profile Card Modal */}
      {visitedUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in" id="visitor-profile-modal">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full p-6 text-center shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden animate-scale-up">
            
            {/* Ambient matching color glow top edge bar */}
            <div 
              className="absolute top-0 left-0 right-0 h-1.5" 
              style={{ backgroundColor: visitedUser.avatarColor || "#89ceff", boxShadow: `0 0 15px ${visitedUser.avatarColor || "#89ceff"}` }}
            />

            {/* Close Button */}
            <button
              onClick={() => setVisitedUser(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-all border border-white/5"
              aria-label="Close Profile"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Profile Avatar Card inside Viewer */}
            <div className="flex flex-col items-center mt-4">
              <div 
                className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white border-4 shrink-0 shadow-xl overflow-hidden bg-slate-950 mb-3" 
                style={{ borderColor: visitedUser.avatarColor || "#89ceff", boxShadow: `0 0 25px ${(visitedUser.avatarColor || "#89ceff")}40` }}
              >
                {visitedUser.photoUrl ? (
                  <img src={visitedUser.photoUrl} alt={visitedUser.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  visitedUser.name ? visitedUser.name.substring(0, 2).toUpperCase() : "??"
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-center gap-2">
                  <h3 className="text-xl font-black text-white" style={{ color: visitedUser.avatarColor || "#fff" }}>
                    {visitedUser.name}
                  </h3>
                  <span className="text-[9px] font-mono font-extrabold px-1.5 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-500/20">
                    {visitedUser.level || "BRONZE"}
                  </span>
                </div>
                
                {visitedUser.id === userId ? (
                  <span className="inline-block text-[9px] font-bold text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-500/20 uppercase tracking-widest">
                    This is You / আপনার আইডি
                  </span>
                ) : (
                  <span className="inline-block text-[9px] font-bold text-pink-400 bg-pink-950/40 px-2 py-0.5 rounded-full border border-pink-500/20 uppercase tracking-widest">
                    Spectator ID / মেম্বার প্রোফাইল
                  </span>
                )}
              </div>
            </div>

            {/* Level and SP Progress for Visited User */}
            {(() => {
              const sp = visitedUser.sp !== undefined ? visitedUser.sp : 100;
              const lvlNum = Math.floor(sp / 200) + 1;
              const currentLevelSp = sp % 200;
              const remainingSp = 200 - currentLevelSp;
              const progressPct = Math.floor((currentLevelSp / 200) * 100);
              return (
                <div className="mt-4 p-3.5 bg-cyan-950/25 border border-cyan-500/20 rounded-2xl text-left space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-bold text-white/95">
                    <span>লেভেল প্রগ্রেস / Level Progress:</span>
                    <span className="text-cyan-400 font-mono font-black">{progressPct}% SP</span>
                  </div>
                  <div className="h-2 w-full bg-black/60 rounded-full overflow-hidden border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[9px] text-white/50 font-medium">
                    <span>মোট: {sp} SP (লেভেল {lvlNum})</span>
                    <span>নেক্সট লেভেলে যেতে <strong className="text-cyan-400 font-black">{remainingSp} SP</strong> বাকি</span>
                  </div>
                </div>
              );
            })()}

            {/* Received Gifts Display */}
            {visitedUser.lastReceivedGift ? (
              <div className="mt-2.5 p-3.5 bg-pink-950/20 border border-pink-500/20 rounded-2xl text-left">
                <span className="text-[10px] font-bold text-pink-400 block mb-1.5">🎁 শেষ প্রাপ্ত উপহার / Last Gift Received:</span>
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl animate-bounce">{visitedUser.lastReceivedGift.icon}</span>
                  <div>
                    <p className="text-xs font-black text-white">{visitedUser.lastReceivedGift.name}</p>
                    <p className="text-[10px] text-white/50">প্রেরক: <span className="text-pink-300">@{visitedUser.lastReceivedGift.sender}</span></p>
                  </div>
                </div>
              </div>
            ) : visitedUser.receivedGiftsCount > 0 ? (
              <div className="mt-2.5 p-3.5 bg-pink-950/10 border border-pink-500/10 rounded-2xl text-left flex items-center justify-between text-xs">
                <span className="font-bold text-pink-300">🎁 মোট প্রাপ্ত উপহার / Total Gifts:</span>
                <span className="font-mono font-black text-white">{visitedUser.receivedGiftsCount}টি ({visitedUser.receivedGiftsValue} কয়েন)</span>
              </div>
            ) : null}

            {/* Visited User Detailed Info Fields */}
            <div className="mt-4 bg-white/5 border border-white/5 rounded-2xl p-4 text-left space-y-4">
              <h4 className="text-xs font-bold text-white/40 uppercase tracking-wider font-mono border-b border-white/5 pb-2">
                মেম্বার পরিচিতি / Personal Info
              </h4>

              <div className="grid grid-cols-2 gap-4">
                {/* Age Field */}
                <div>
                  <span className="text-[10px] text-white/40 block font-bold font-sans">বয়স / Age</span>
                  <span className="text-sm font-extrabold text-white">
                    {visitedUser.age ? `${visitedUser.age} বছর` : "উল্লেখ নেই (Not Specified)"}
                  </span>
                </div>

                {/* Gender Field */}
                <div>
                  <span className="text-[10px] text-white/40 block font-bold font-sans">লিঙ্গ / Gender</span>
                  <span className="text-sm font-extrabold text-pink-300">
                    {visitedUser.gender === "Male" ? "ছেলে / Male" : visitedUser.gender === "Female" ? "মেয়ে / Female" : visitedUser.gender === "Other" ? "অন্যান্য / Other" : "উল্লেখ নেই (Not Specified)"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                {/* Location Field */}
                <div>
                  <span className="text-[10px] text-white/40 block font-bold font-sans">লোকেশন / Location</span>
                  <span className="text-xs font-bold text-white leading-tight block truncate" title={visitedUser.location || "উল্লেখ নেই"}>
                    {visitedUser.location || "উল্লেখ নেই (Not Specified)"}
                  </span>
                </div>

                {/* Address Field */}
                <div>
                  <span className="text-[10px] text-white/40 block font-bold font-sans">ঠিকানা / Address</span>
                  <span className="text-xs font-bold text-white/80 leading-tight block truncate" title={visitedUser.address || "উল্লেখ নেই"}>
                    {visitedUser.address || "উল্লেখ নেই (Not Specified)"}
                  </span>
                </div>
              </div>

              {/* Coins & level info row */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded bg-yellow-500/10 flex items-center justify-center text-xs text-yellow-400">🪙</div>
                  <span className="text-[10px] text-white/50 font-bold">ব্যালেন্স:</span>
                  <span className="text-xs font-mono font-black text-yellow-400">{visitedUser.walletBalance || 0} Coins</span>
                </div>
                
                <span className="text-[9px] text-white/40 font-mono font-bold">
                  Last active: {visitedUser.lastActive ? new Date(visitedUser.lastActive).toLocaleDateString() : "Just now"}
                </span>
              </div>
            </div>

            {/* Follow & Friend social controls */}
            {visitedUser.id !== userId && !visitedUser.isGuest && (
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {/* Follow Button */}
                <button
                  type="button"
                  onClick={() => handleToggleFollow(visitedUser.id)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                    userProfile.followedUsers?.includes(visitedUser.id)
                      ? "bg-rose-500/10 border-rose-500/40 text-rose-300"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  <Heart className={`w-3.5 h-3.5 ${userProfile.followedUsers?.includes(visitedUser.id) ? "fill-rose-400 text-rose-400" : ""}`} />
                  <span>
                    {userProfile.followedUsers?.includes(visitedUser.id) ? "ফলোইং / Following" : "ফলো করুন / Follow"}
                  </span>
                </button>

                {/* Friend Button */}
                <button
                  type="button"
                  onClick={() => handleToggleFriend(visitedUser.id)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 border ${
                    userProfile.friends?.includes(visitedUser.id)
                      ? "bg-teal-500/10 border-teal-500/40 text-teal-300"
                      : "bg-white/5 border-white/10 text-white hover:bg-white/10"
                  }`}
                >
                  <span>🤝</span>
                  <span>
                    {userProfile.friends?.includes(visitedUser.id) ? "বন্ধু / Friends" : "ফ্রেন্ড হোন / Add Friend"}
                  </span>
                </button>
              </div>
            )}

            {/* Direct join live board button from visited user profile popup! */}
            {(() => {
              const liveRoom = rooms.find(
                (r) => r.streamerId === visitedUser.id || r.streamerName === visitedUser.name
              );
              if (liveRoom && visitedUser.id !== userId) {
                return (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveRoomId(liveRoom.id);
                        setActiveTab("home");
                        setVisitedUser(null);
                        alert(`${visitedUser.name}-এর লাইভ বোর্ডে প্রবেশ করা হচ্ছে!`);
                      }}
                      className="w-full py-3 bg-gradient-to-r from-red-600 to-rose-500 hover:from-red-500 hover:to-rose-400 text-white rounded-xl font-black text-xs shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all flex items-center justify-center gap-1.5 animate-bounce"
                    >
                      <span className="w-1.5 h-1.5 bg-white rounded-full block animate-ping" />
                      <span>🔴 সরাসরি লাইভ বোর্ডে যোগ দিন / Join Live Board</span>
                    </button>
                  </div>
                );
              }
              return null;
            })()}

            {/* Quick Greeting Coin Gift to this member */}
            {visitedUser.id !== userId && !visitedUser.isGuest && (
              <div className="mt-5">
                <button
                  onClick={async () => {
                    if (userProfile.walletBalance < 10) {
                      alert("পর্যাপ্ত Coins ব্যালেন্স নেই!");
                      return;
                    }
                    // Deduct 10 Coins from current user, add to target
                    setUserProfile(prev => ({ ...prev, walletBalance: prev.walletBalance - 10 }));
                    
                    try {
                      // Update visited user balance in Firestore
                      const targetDocRef = doc(db, "users", visitedUser.id);
                      await setDoc(targetDocRef, {
                        walletBalance: (visitedUser.walletBalance || 0) + 10
                      }, { merge: true });
                      
                      // Show success message inside visitedUser view state
                      setVisitedUser(prev => prev ? ({ ...prev, walletBalance: (prev.walletBalance || 0) + 10 }) : null);
                      
                      alert(`সফলভাবে ১০টি Coins উপহার পাঠানো হয়েছে ${visitedUser.name}-কে!`);
                    } catch (e) {
                      console.error("Gift error:", e);
                    }
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 rounded-xl font-black text-xs shadow-[0_0_15px_rgba(245,158,11,0.25)] transition-all flex items-center justify-center gap-1.5 animate-pulse"
                >
                  <span>✨</span>
                  <span>১০ Coins গিফট করুন / Send 10 Coins</span>
                </button>
              </div>
            )}

            {/* Dismiss Card Button */}
            <div className="mt-3">
              <button
                onClick={() => setVisitedUser(null)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl font-bold text-xs transition-all border border-white/5"
              >
                বন্ধ করুন / Close Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
