/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState, useRef } from "react";
import { MicSeat, UserProfile } from "../types";
import { db } from "../firebase";
import { doc, runTransaction, collection, onSnapshot, setDoc, addDoc, query, orderBy, limit } from "firebase/firestore";
import { Mic, MicOff, Camera, CameraOff, VolumeX, Trash2, Plus, LogOut, Volume2 } from "lucide-react";

interface MicSeatsGridProps {
  roomId: string;
  seats: MicSeat[] | undefined;
  userId: string;
  userProfile: UserProfile;
  isHost: boolean;
  onSelectRecipient?: (id: string, name: string) => void;
  isQuotaExceeded?: boolean;
  onUpdateSeats?: (updatedSeats: MicSeat[]) => void;
}

// Seat Video Preview component to capture real webcam if allowed, with a simulated live cam fallback
function SeatVideoPreview() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        .then((s) => {
          activeStream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch((e) => console.log("Seat video play error:", e));
          }
        })
        .catch((err) => {
          console.warn("Seat real webcam blocked/failed. Using virtual simulation.", err);
          setError(true);
        });
    } else {
      setError(true);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  if (error) {
    return (
      <div className="absolute inset-0 bg-gradient-to-tr from-pink-600/40 via-purple-600/30 to-cyan-500/30 flex flex-col items-center justify-center text-[8px] text-pink-300 font-black text-center p-1 leading-tight select-none">
        <span className="animate-pulse">ক্যামেরা অন</span>
        <span className="text-[7px] text-cyan-300 tracking-widest font-mono">SIMULATING</span>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      className="w-full h-full object-cover absolute inset-0 rounded-full"
    />
  );
}

export default function MicSeatsGrid({
  roomId,
  seats,
  userId,
  userProfile,
  isHost,
  onSelectRecipient,
  isQuotaExceeded = false,
  onUpdateSeats,
}: MicSeatsGridProps) {
  // Initialize seats if undefined
  const finalSeats = seats || Array.from({ length: 10 }, (_, i) => ({
    index: i,
    userId: null,
    userName: null,
    userAvatar: null,
    userPhotoUrl: null,
    avatarColor: null,
    isMutedByHost: false,
    isMicActive: true,
    isCameraActive: true,
    isSpeaking: false,
  }));

  const [localMicActive, setLocalMicActive] = useState(true);
  const [localCameraActive, setLocalCameraActive] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [myMicVolume, setMyMicVolume] = useState<number>(0);
  const [localAudioStream, setLocalAudioStream] = useState<MediaStream | null>(null);

  // Real-time floating comments on seats/boards
  const [seatComments, setSeatComments] = useState<{ [userId: string]: { text: string; id: string } }>({});

  useEffect(() => {
    if (!roomId) return;
    const msgsColRef = collection(db, "rooms", roomId, "messages");
    // Get last 15 messages so we can capture real-time additions
    const q = query(msgsColRef, orderBy("createdAt", "desc"), limit(15));
    
    const unsub = onSnapshot(q, (snap) => {
      const newComments: typeof seatComments = {};
      const now = Date.now();

      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const data = change.doc.data();
          if (data.isSystem) return;

          // Only trigger for messages created within the last 15 seconds to prevent stale on-load flashes
          if (data.createdAt && now - data.createdAt < 15000) {
            const text = data.message || "";
            const senderName = data.user || "";

            // 1. Try to match by sender's name (if sender is on a seat)
            const senderSeat = finalSeats.find(s => 
              s.userName && senderName && 
              s.userName.trim().toLowerCase() === senderName.trim().toLowerCase()
            );

            if (senderSeat && senderSeat.userId) {
              newComments[senderSeat.userId] = {
                text,
                id: change.doc.id
              };
            }

            // 2. Also match if any seat occupant is mentioned with @ (e.g. "@sorif hi")
            finalSeats.forEach((s) => {
              if (s.userName && s.userId) {
                const mentionTag = `@${s.userName.trim().toLowerCase()}`;
                if (text.toLowerCase().includes(mentionTag)) {
                  newComments[s.userId] = {
                    text,
                    id: change.doc.id
                  };
                }
              }
            });
          }
        }
      });

      if (Object.keys(newComments).length > 0) {
        setSeatComments(prev => ({
          ...prev,
          ...newComments
        }));

        // Automatically clear comment after 6 seconds
        Object.keys(newComments).forEach((uid) => {
          setTimeout(() => {
            setSeatComments(prev => {
              const updated = { ...prev };
              if (updated[uid] && updated[uid].id === newComments[uid].id) {
                delete updated[uid];
              }
              return updated;
            });
          }, 6000);
        });
      }
    }, (err) => {
      console.error("MicSeatsGrid messages snapshot error:", err);
    });

    return () => unsub();
  }, [roomId, finalSeats.map(s => s.userId + "-" + s.userName).join(",")]);

  // WebRTC multi-party voice mesh state and references
  const pcsRef = useRef<{ [peerUserId: string]: RTCPeerConnection }>({});
  const audiosRef = useRef<{ [peerUserId: string]: HTMLAudioElement }>({});
  const unsubsRef = useRef<{ [key: string]: () => void }>({});
  const localStreamRef = useRef<MediaStream | null>(null);

  const closePeerConnection = (peerId: string) => {
    console.log(`Closing WebRTC peer connection with user ${peerId}`);
    if (pcsRef.current[peerId]) {
      try {
        pcsRef.current[peerId].close();
      } catch (e) {
        console.warn("Error closing peer connection:", e);
      }
      delete pcsRef.current[peerId];
    }
    if (audiosRef.current[peerId]) {
      try {
        audiosRef.current[peerId].pause();
        audiosRef.current[peerId].remove();
      } catch (e) {
        console.warn("Error removing audio element:", e);
      }
      delete audiosRef.current[peerId];
    }
    if (unsubsRef.current[`sig_${peerId}`]) {
      try {
        unsubsRef.current[`sig_${peerId}`]();
      } catch (e) {
        console.warn("Error unsubscribing signal listener:", e);
      }
      delete unsubsRef.current[`sig_${peerId}`];
    }
    if (unsubsRef.current[`cand_${peerId}`]) {
      try {
        unsubsRef.current[`cand_${peerId}`]();
      } catch (e) {
        console.warn("Error unsubscribing candidate listener:", e);
      }
      delete unsubsRef.current[`cand_${peerId}`];
    }
  };

  const cleanupAllConnections = () => {
    console.log("Cleaning up all WebRTC voice mesh connections");
    Object.keys(pcsRef.current).forEach((peerId) => {
      closePeerConnection(peerId);
    });
    if (localStreamRef.current) {
      try {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch (e) {
        console.warn("Error stopping local stream track:", e);
      }
      localStreamRef.current = null;
    }
  };

  // Ensure thorough connection cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupAllConnections();
    };
  }, []);

  const occupiedSeatsCount = finalSeats.filter((s) => s.userId !== null).length;
  const userSeat = finalSeats.find((s) => s.userId === userId);
  const isOnSeat = !!userSeat;

  // Sync state only on sitting down or if host mutes/unmutes us
  const prevIsOnSeatRef = useRef(false);
  useEffect(() => {
    const wasOnSeat = prevIsOnSeatRef.current;
    prevIsOnSeatRef.current = isOnSeat;

    if (isOnSeat && !wasOnSeat && userSeat) {
      // Just sat down! Copy initial seat settings to local state
      setLocalMicActive(userSeat.isMicActive ?? true);
      setLocalCameraActive(userSeat.isCameraActive ?? true);
    }
  }, [isOnSeat, userSeat]);

  // Handle Host Mutemode explicitly
  useEffect(() => {
    if (userSeat?.isMutedByHost && localMicActive) {
      setLocalMicActive(false);
    }
  }, [userSeat?.isMutedByHost, localMicActive]);

  // 1. Manage stable single local audio stream based on seat occupancy & mic activity
  useEffect(() => {
    if (!isOnSeat || !localMicActive) {
      if (localAudioStream) {
        try {
          localAudioStream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn("Error stopping local audio stream tracks:", e);
        }
        setLocalAudioStream(null);
        localStreamRef.current = null;
      }
      return;
    }

    let activeStream: MediaStream | null = null;
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true, video: false })
        .then((s) => {
          activeStream = s;
          setLocalAudioStream(s);
          localStreamRef.current = s;
        })
        .catch((err) => {
          console.error("Failed to acquire microphone stream:", err);
          setLocalAudioStream(null);
          localStreamRef.current = null;
        });
    }

    return () => {
      if (activeStream) {
        try {
          activeStream.getTracks().forEach((track) => track.stop());
        } catch (e) {
          console.warn("Error stopping active stream tracks on cleanup:", e);
        }
      }
    };
  }, [isOnSeat, localMicActive]);

  // 2. Real-time microphone audio volume spectrum analyser for current user
  useEffect(() => {
    if (!localAudioStream) {
      setMyMicVolume(0);
      return;
    }

    let audioCtx: AudioContext | null = null;
    let analyser: AnalyserNode | null = null;
    let source: MediaStreamAudioSourceNode | null = null;
    let intervalId: any = null;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        source = audioCtx.createMediaStreamSource(localAudioStream);
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        intervalId = setInterval(() => {
          if (!analyser) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += dataArray[i];
          }
          const avg = sum / bufferLength;
          // Scale and cap the volume value
          const normalized = Math.min(100, Math.floor(avg * 1.8));
          setMyMicVolume(normalized);
        }, 100);
      }
    } catch (e) {
      console.warn("Local mic analyser initialization failed, using simulation pulse:", e);
      intervalId = setInterval(() => {
        setMyMicVolume(Math.floor(15 + Math.random() * 25));
      }, 400);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      if (audioCtx) {
        try {
          audioCtx.close();
        } catch (err) {
          console.warn("Error closing AudioContext:", err);
        }
      }
    };
  }, [localAudioStream]);

  // 3. WebRTC Multi-Party Voice Connection Mesh for Active Mic Seats
  useEffect(() => {
    if (!isOnSeat || !localMicActive || !localAudioStream) {
      // Clean up all connections if we are not on a seat or mic is disabled
      cleanupAllConnections();
      return;
    }

    // Get list of other active users on the mic seats
    const otherSeatUsers = finalSeats
      .filter(s => s.userId && s.userId !== userId && (s.isMicActive ?? true) && !s.isMutedByHost)
      .map(s => s.userId as string);

    // Google public STUN servers
    const rtcConfig = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        { urls: "stun:stun.ekiga.net" },
        { urls: "stun:stun.ideasip.com" }
      ]
    };

    const connectionStartedAt = Date.now();

    // Set up connections for each peer
    otherSeatUsers.forEach(async (otherId) => {
      if (pcsRef.current[otherId]) return; // Connection already exists

      console.log(`Setting up voice peer connection with ${otherId}`);
      const pc = new RTCPeerConnection(rtcConfig);
      pcsRef.current[otherId] = pc;

      // Add local tracks to send voice
      localAudioStream.getTracks().forEach((track) => {
        pc.addTrack(track, localAudioStream);
      });

      // Handle remote track received
      pc.ontrack = (event) => {
        console.log(`Received WebRTC audio stream from ${otherId}`);
        if (audiosRef.current[otherId]) {
          try {
            audiosRef.current[otherId].srcObject = event.streams[0];
          } catch (e) {
            console.warn("Error setting audio source object:", e);
          }
          return;
        }
        const audio = document.createElement("audio");
        audio.srcObject = event.streams[0];
        audio.autoplay = true;
        audio.controls = false;
        audio.volume = 1.0;
        document.body.appendChild(audio);
        audiosRef.current[otherId] = audio;
      };

      // Determine Offerer/Answerer roles based on lexical order of IDs
      if (userId < otherId) {
        // I am the OFFERER
        console.log(`Initiating WebRTC offer to ${otherId}`);
        
        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            const candRef = doc(db, "rooms", roomId, "signals", `${userId}_${otherId}`, "candidates", `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
            await setDoc(candRef, { 
              candidate: JSON.stringify(event.candidate.toJSON()), 
              senderId: userId,
              createdAt: Date.now()
            });
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const sigRef = doc(db, "rooms", roomId, "signals", `${userId}_${otherId}`);
        await setDoc(sigRef, {
          offer: JSON.stringify(offer),
          offererId: userId,
          answererId: otherId,
          createdAt: Date.now()
        }, { merge: true });

        // Listen for answer
        const unsubSig = onSnapshot(sigRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.answer && pc.signalingState !== "stable") {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.answer)));
                console.log(`WebRTC connection established with ${otherId} (Offerer side)`);
              } catch (e) {
                console.error("Error setting remote description from answer:", e);
              }
            }
          }
        });
        unsubsRef.current[`sig_${otherId}`] = unsubSig;

        // Listen for remote candidates (which Answerer writes under candidates_ans)
        const candidatesCol = collection(db, "rooms", roomId, "signals", `${userId}_${otherId}`, "candidates_ans");
        const unsubCand = onSnapshot(candidatesCol, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (data.candidate && data.createdAt && data.createdAt >= connectionStartedAt - 10000) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate)));
                } catch (e) {
                  console.warn("Error adding ICE candidate:", e);
                }
              }
            }
          });
        });
        unsubsRef.current[`cand_${otherId}`] = unsubCand;

      } else {
        // I am the ANSWERER
        console.log(`Waiting for WebRTC offer from ${otherId}`);
        const sigRef = doc(db, "rooms", roomId, "signals", `${otherId}_${userId}`);

        pc.onicecandidate = async (event) => {
          if (event.candidate) {
            const candRef = doc(db, "rooms", roomId, "signals", `${otherId}_${userId}`, "candidates_ans", `cand_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`);
            await setDoc(candRef, { 
              candidate: JSON.stringify(event.candidate.toJSON()), 
              senderId: userId,
              createdAt: Date.now()
            });
          }
        };

        const unsubSig = onSnapshot(sigRef, async (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            if (data.offer && !pc.remoteDescription && data.createdAt && data.createdAt >= connectionStartedAt - 15000) {
              try {
                await pc.setRemoteDescription(new RTCSessionDescription(JSON.parse(data.offer)));
                const answer = await pc.createAnswer();
                await pc.setLocalDescription(answer);
                await setDoc(sigRef, { answer: JSON.stringify(answer) }, { merge: true });
                console.log(`WebRTC connection established with ${otherId} (Answerer side)`);
              } catch (e) {
                console.error("Error setting remote offer and answering:", e);
              }
            }
          }
        });
        unsubsRef.current[`sig_${otherId}`] = unsubSig;

        // Listen for remote candidates (which Offerer writes under candidates)
        const candidatesCol = collection(db, "rooms", roomId, "signals", `${otherId}_${userId}`, "candidates");
        const unsubCand = onSnapshot(candidatesCol, (snapshot) => {
          snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
              const data = change.doc.data();
              if (data.candidate && data.createdAt && data.createdAt >= connectionStartedAt - 10000) {
                try {
                  await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(data.candidate)));
                } catch (e) {
                  console.warn("Error adding ICE candidate:", e);
                }
              }
            }
          });
        });
        unsubsRef.current[`cand_${otherId}`] = unsubCand;
      }
    });

    // Cleanup disconnected peers
    Object.keys(pcsRef.current).forEach((peerId) => {
      if (!otherSeatUsers.includes(peerId)) {
        console.log(`Cleaning up disconnected WebRTC peer: ${peerId}`);
        closePeerConnection(peerId);
      }
    });

  }, [isOnSeat, localMicActive, localAudioStream, finalSeats.map(s => `${s.userId}_${s.isMicActive}_${s.isMutedByHost}`).join(",")]);

  // Bengali Voice and speech engine
  const speakBengaliText = (text: string) => {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      const bnVoice = voices.find(
        (v) => v.lang.toLowerCase().includes("bn") || v.lang.toLowerCase().includes("bengali")
      );
      if (bnVoice) {
        utterance.voice = bnVoice;
      }
      utterance.lang = "bn-BD";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Vocal synth error:", e);
    }
  };

  // Real-time voice state sync (throttled/debounced) to Firestore
  const [isCurrentlySpeaking, setIsCurrentlySpeaking] = useState(false);
  const [isSpeakingDb, setIsSpeakingDb] = useState(false);

  useEffect(() => {
    const speaking = myMicVolume > 8;
    if (speaking !== isCurrentlySpeaking) {
      setIsCurrentlySpeaking(speaking);
    }
  }, [myMicVolume, isCurrentlySpeaking]);

  useEffect(() => {
    if (isCurrentlySpeaking) {
      setIsSpeakingDb(true);
    } else {
      const handler = setTimeout(() => {
        setIsSpeakingDb(false);
      }, 1200); // 1.2s debounce to avoid rapid toggling in database
      return () => clearTimeout(handler);
    }
  }, [isCurrentlySpeaking]);

  useEffect(() => {
    if (!isOnSeat || !roomId) return;
    const roomDocRef = doc(db, "rooms", roomId);
    runTransaction(db, async (transaction) => {
      const roomSnap = await transaction.get(roomDocRef);
      if (!roomSnap.exists()) return;

      const roomData = roomSnap.data();
      let currentSeats: MicSeat[] = roomData.seats || [];
      if (currentSeats.length === 0) return;

      let changed = false;
      currentSeats = currentSeats.map((s) => {
        if (s.userId === userId && s.isSpeaking !== isSpeakingDb) {
          changed = true;
          return { ...s, isSpeaking: isSpeakingDb };
        }
        return s;
      });

      if (changed) {
        transaction.update(roomDocRef, { seats: currentSeats });
      }
    }).catch((e) => console.log("Failed to update active speaking state in db:", e));
  }, [isSpeakingDb, isOnSeat, roomId, userId]);

  // Self-healing Heartbeat and Pruning for Seat Presence
  useEffect(() => {
    if (!roomId) return;

    // Heartbeat update loop for the current user
    const heartbeatInterval = setInterval(() => {
      if (!isOnSeat) return;
      const roomDocRef = doc(db, "rooms", roomId);
      runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let currentSeats: MicSeat[] = roomData.seats || [];
        if (currentSeats.length === 0) return;

        let changed = false;
        currentSeats = currentSeats.map((s) => {
          if (s.userId === userId) {
            changed = true;
            return { ...s, lastActive: Date.now() };
          }
          return s;
        });

        if (changed) {
          transaction.update(roomDocRef, { seats: currentSeats });
        }
      }).catch((e) => console.log("Heartbeat update error:", e));
    }, 8000);

    // Pruning loop to clear out any stale/disconnected seats
    const pruningInterval = setInterval(() => {
      const roomDocRef = doc(db, "rooms", roomId);
      runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let currentSeats: MicSeat[] = roomData.seats || [];
        if (currentSeats.length === 0) return;

        let changed = false;
        const now = Date.now();

        currentSeats = currentSeats.map((s) => {
          if (s.userId && s.userId !== userId) {
            const lastActiveTime = s.lastActive || 0;
            // Clear seat if user left/closed tab (> 24 seconds of silence)
            if (lastActiveTime > 0 && now - lastActiveTime > 24000) {
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
          }
          return s;
        });

        if (changed) {
          transaction.update(roomDocRef, { seats: currentSeats });
        }
      }).catch((e) => console.log("Pruning stale seats error:", e));
    }, 12000);

    return () => {
      clearInterval(heartbeatInterval);
      clearInterval(pruningInterval);
    };
  }, [roomId, isOnSeat, userId]);

  // Take a specific seat index
  const handleTakeSeat = async (seatIndex: number) => {
    if (actionLoading) return;
    setActionLoading(true);
    const roomDocRef = doc(db, "rooms", roomId);

    let currentSeats = [...finalSeats].map((s) => {
      if (s.userId === userId) {
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

    currentSeats[seatIndex] = {
      index: seatIndex,
      userId: userId,
      userName: userProfile.name,
      userAvatar: userProfile.avatarUrl || "",
      userPhotoUrl: userProfile.photoUrl || "",
      avatarColor: userProfile.avatarColor || "#89ceff",
      isMutedByHost: false,
      isMicActive: localMicActive,
      isCameraActive: localCameraActive,
      isSpeaking: false,
      lastActive: Date.now(),
    };

    if (isQuotaExceeded) {
      onUpdateSeats?.(currentSeats);
      speakBengaliText(`আমি সিট নাম্বার ${seatIndex + 1}-এ যোগ দিয়েছি!`);
      setActionLoading(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let databaseSeats: MicSeat[] = roomData.seats || [];

        if (databaseSeats.length === 0) {
          databaseSeats = Array.from({ length: 10 }, (_, i) => ({
            index: i,
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
          }));
        }

        if (databaseSeats[seatIndex].userId) {
          throw new Error("এই আসনটি ইতোমধ্যে পূর্ণ হয়ে গেছে!");
        }

        databaseSeats = databaseSeats.map((s) => {
          if (s.userId === userId) {
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

        databaseSeats[seatIndex] = currentSeats[seatIndex];
        transaction.update(roomDocRef, { seats: databaseSeats });
      });

      speakBengaliText(`আমি সিট নাম্বার ${seatIndex + 1}-এ যোগ দিয়েছি!`);
    } catch (err: any) {
      console.error("Error joining seat:", err);
      if (err?.message?.includes("Quota exceeded") || err?.message?.includes("quota") || err?.code === "resource-exhausted") {
        onUpdateSeats?.(currentSeats);
        speakBengaliText(`আমি সিট নাম্বার ${seatIndex + 1}-এ যোগ দিয়েছি!`);
      } else {
        alert(err.message || "সিটে যোগ দিতে সমস্যা হয়েছে!");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Leave active seat
  const handleLeaveSeat = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    const roomDocRef = doc(db, "rooms", roomId);

    let currentSeats = [...finalSeats].map((s) => {
      if (s.userId === userId) {
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

    if (isQuotaExceeded) {
      onUpdateSeats?.(currentSeats);
      setActionLoading(false);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let databaseSeats: MicSeat[] = roomData.seats || [];
        if (databaseSeats.length === 0) return;

        databaseSeats = databaseSeats.map((s) => {
          if (s.userId === userId) {
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

        transaction.update(roomDocRef, { seats: databaseSeats });
      });
    } catch (err) {
      console.error("Error leaving seat:", err);
      onUpdateSeats?.(currentSeats);
    } finally {
      setActionLoading(false);
    }
  };

  // Toggle mic state
  const handleToggleMic = async () => {
    const nextMicState = !localMicActive;
    setLocalMicActive(nextMicState);

    if (!isOnSeat) return;
    const roomDocRef = doc(db, "rooms", roomId);

    let currentSeats = [...finalSeats].map((s) => {
      if (s.userId === userId) {
        return { ...s, isMicActive: nextMicState };
      }
      return s;
    });

    if (isQuotaExceeded) {
      onUpdateSeats?.(currentSeats);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let databaseSeats: MicSeat[] = roomData.seats || [];
        if (databaseSeats.length === 0) return;

        databaseSeats = databaseSeats.map((s) => {
          if (s.userId === userId) {
            return { ...s, isMicActive: nextMicState };
          }
          return s;
        });

        transaction.update(roomDocRef, { seats: databaseSeats });
      });
    } catch (err) {
      console.error("Error toggling mic in database:", err);
      onUpdateSeats?.(currentSeats);
    }
  };

  // Toggle camera state
  const handleToggleCamera = async () => {
    const nextCamState = !localCameraActive;
    setLocalCameraActive(nextCamState);

    if (!isOnSeat) return;
    const roomDocRef = doc(db, "rooms", roomId);

    let currentSeats = [...finalSeats].map((s) => {
      if (s.userId === userId) {
        return { ...s, isCameraActive: nextCamState };
      }
      return s;
    });

    if (isQuotaExceeded) {
      onUpdateSeats?.(currentSeats);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let databaseSeats: MicSeat[] = roomData.seats || [];
        if (databaseSeats.length === 0) return;

        databaseSeats = databaseSeats.map((s) => {
          if (s.userId === userId) {
            return { ...s, isCameraActive: nextCamState };
          }
          return s;
        });

        transaction.update(roomDocRef, { seats: databaseSeats });
      });
    } catch (err) {
      console.error("Error toggling camera in database:", err);
      onUpdateSeats?.(currentSeats);
    }
  };

  // Host Action: Mute/Unmute seat index
  const handleHostToggleMute = async (targetIndex: number) => {
    if (!isHost) return;
    const roomDocRef = doc(db, "rooms", roomId);

    let currentSeats = [...finalSeats].map((s) => {
      if (s.index === targetIndex) {
        const isMuted = !s.isMutedByHost;
        return {
          ...s,
          isMutedByHost: isMuted,
          isMicActive: isMuted ? false : s.isMicActive,
        };
      }
      return s;
    });

    if (isQuotaExceeded) {
      onUpdateSeats?.(currentSeats);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let databaseSeats: MicSeat[] = roomData.seats || [];
        if (databaseSeats.length === 0) return;

        databaseSeats = databaseSeats.map((s) => {
          if (s.index === targetIndex) {
            const isMuted = !s.isMutedByHost;
            return {
              ...s,
              isMutedByHost: isMuted,
              isMicActive: isMuted ? false : s.isMicActive,
            };
          }
          return s;
        });

        transaction.update(roomDocRef, { seats: databaseSeats });
      });
    } catch (err) {
      console.error("Host error toggling mute:", err);
      onUpdateSeats?.(currentSeats);
    }
  };

  // Host Action: Kick user from seat index
  const handleHostKick = async (targetIndex: number) => {
    if (!isHost) return;
    const roomDocRef = doc(db, "rooms", roomId);

    let currentSeats = [...finalSeats].map((s) => {
      if (s.index === targetIndex) {
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

    if (isQuotaExceeded) {
      onUpdateSeats?.(currentSeats);
      return;
    }

    try {
      await runTransaction(db, async (transaction) => {
        const roomSnap = await transaction.get(roomDocRef);
        if (!roomSnap.exists()) return;

        const roomData = roomSnap.data();
        let databaseSeats: MicSeat[] = roomData.seats || [];
        if (databaseSeats.length === 0) return;

        databaseSeats = databaseSeats.map((s) => {
          if (s.index === targetIndex) {
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

        transaction.update(roomDocRef, { seats: databaseSeats });
      });
    } catch (err) {
      console.error("Host error kicking user from seat:", err);
      onUpdateSeats?.(currentSeats);
    }
  };

  return (
    <div className="bg-[#121422] border border-white/10 rounded-2xl p-5 space-y-6 shadow-2xl" id="mic-seats-section">
      {/* Upper Status Row with Co-hosts Counter */}
      <div className="flex flex-col xs:flex-row items-center justify-between gap-3 pb-3 border-b border-white/5">
        <div>
          <h3 className="text-xs font-black text-pink-400 uppercase tracking-widest flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse block" />
            <span>লাইভ অডিও সিট / Live Audio Board</span>
          </h3>
          <p className="text-[10px] text-white/50 mt-0.5">১-১০ জন একসাথে লাইভে কথা বলতে পারবে</p>
        </div>

        {/* Counter of Speakers connected */}
        <div className="bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-purple-500/20 px-3.5 py-1.5 rounded-xl text-center">
          <span className="text-[10px] text-purple-300 font-bold block uppercase tracking-wider">যুক্ত মেম্বার / Speakers</span>
          <span className="text-sm font-black text-white font-mono">{occupiedSeatsCount} / 10</span>
        </div>
      </div>


      {/* Camera & Microphone Toggles - extremely user-friendly and prominent */}
      <div className="bg-black/45 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-xs font-bold text-white block">আপনার মিডিয়া কন্ট্রোল / Media Controls</span>
          <p className="text-[9px] text-white/40">লাইভে সুন্দরভাবে কথা বলতে নিচে মাইক অন রাখুন</p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Microphone On/Off Toggle */}
          <button
            type="button"
            onClick={handleToggleMic}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
              localMicActive
                ? "bg-green-600/20 border-green-500/40 text-green-300 shadow-[0_0_12px_rgba(34,197,94,0.2)]"
                : "bg-red-600/20 border-red-500/40 text-red-300"
            }`}
          >
            {localMicActive ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            <span>{localMicActive ? "মাইক অন / Mic On" : "মাইক অফ / Mic Off"}</span>
          </button>

          {/* If sitting, show Leave Seat button */}
          {isOnSeat && (
            <button
              type="button"
              onClick={handleLeaveSeat}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white/90 font-bold text-xs border border-white/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400" />
              <span>সিট ছাড়ুন / Leave Seat</span>
            </button>
          )}
        </div>
      </div>

      {/* Grid of 1-10 slots/seats */}
      <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-2">
        {finalSeats.map((seat, index) => {
          const isOccupied = !!seat.userId;
          const isMeOnThisSeat = seat.userId === userId;
          
          // Audio simulation pulsing when mic is on and not muted by host and actively speaking
          const isTransmittingVoice = isOccupied && seat.isMicActive && !seat.isMutedByHost && (isMeOnThisSeat ? myMicVolume > 8 : !!seat.isSpeaking);
          
          // Compute dynamic pulse scale and shadow if it's the current user speaking physically
          const speechPulseScale = isMeOnThisSeat && isTransmittingVoice ? 1 + (myMicVolume / 350) : 1;
          const speechPulseShadow = isMeOnThisSeat && isTransmittingVoice 
            ? `0 0 ${10 + (myMicVolume / 6)}px #22c55e` 
            : isTransmittingVoice 
            ? "0 0 10px #22c55e" 
            : "none";

          return (
            <div
              key={index}
              onClick={() => {
                if (isOccupied && seat.userId) {
                  onSelectRecipient?.(seat.userId, seat.userName || "মেম্বার");
                  speakBengaliText(`${seat.userName}-কে উপহার প্রাপক হিসেবে সিলেক্ট করা হয়েছে!`);
                }
              }}
              className={`p-2 rounded-xl border transition-all flex flex-col items-center justify-between text-center relative ${
                isOccupied ? "cursor-pointer hover:scale-105 hover:bg-slate-900/60" : ""
              } ${
                isMeOnThisSeat
                  ? "bg-pink-950/20 border-pink-500/30 shadow-[0_0_12px_rgba(236,72,153,0.12)]"
                  : isOccupied
                  ? "bg-slate-950/40 border-white/5"
                  : "bg-black/10 border-dashed border-white/10 hover:border-pink-500/20 hover:bg-pink-950/5"
              }`}
            >
              {/* Seat Indicator Header */}
              <div className="flex items-center gap-1 mb-1.5">
                <span className="text-[7px] font-mono font-bold text-white/30 uppercase tracking-wider bg-black/35 px-1 py-0.5 rounded">
                  S{index + 1}
                </span>
                {isHost && index === 0 && (
                  <span className="text-[7px] font-bold text-pink-400 bg-pink-950/40 px-1 py-0.5 rounded">
                    👑 HOST
                  </span>
                )}
              </div>

              {/* Avatar/Placeholder */}
              <div className="relative mb-1.5">
                {/* Floating live comment speech bubble */}
                {isOccupied && seat.userId && seatComments[seat.userId] && (
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[8px] sm:text-[9px] font-extrabold px-2 py-1 rounded-lg shadow-[0_0_15px_rgba(236,72,153,0.35)] border border-pink-400/20 z-[100] animate-bounce min-w-[80px] max-w-[120px] break-words">
                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-purple-600 rotate-45 border-r border-b border-pink-400/20" />
                    {seatComments[seat.userId].text}
                  </div>
                )}

                {isOccupied ? (
                  <div
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-[10px] font-black text-white border-2 bg-slate-950 overflow-hidden relative transition-all duration-100"
                    style={{
                      borderColor: isTransmittingVoice ? "#4ade80" : "rgba(255,255,255,0.1)",
                      transform: `scale(${speechPulseScale})`,
                      boxShadow: speechPulseShadow,
                    }}
                  >
                    {/* Render User Photo or Initials (No Video Streams/Previews) */}
                    {seat.userPhotoUrl ? (
                      <img
                        src={seat.userPhotoUrl}
                        alt={seat.userName || "user"}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span>{seat.userName ? seat.userName.substring(0, 2).toUpperCase() : "??"}</span>
                    )}

                    {/* Microphone Mute Overlay Badge */}
                    {!seat.isMicActive && (
                      <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                        <MicOff className="w-3 h-3 text-red-400" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full border border-dashed border-white/15 flex items-center justify-center bg-black/30 text-white/25 hover:text-pink-400 hover:border-pink-500/20 transition-colors">
                    <span className="text-xs">🎙️</span>
                  </div>
                )}

                {/* Voice waves ring */}
                {isTransmittingVoice && (
                  <span className="absolute -inset-1 rounded-full border border-green-500/30 animate-ping pointer-events-none" />
                )}
              </div>

              {/* Occupied User Details or Join Button */}
              {isOccupied ? (
                <div className="w-full space-y-1 z-10">
                  <p
                    className="text-[9px] font-bold truncate max-w-full"
                    style={{ color: seat.avatarColor || "#ffffff" }}
                  >
                    {seat.userName} {isMeOnThisSeat ? "(আমি)" : ""}
                  </p>

                  {/* Indicators */}
                  <div className="flex items-center justify-center gap-1">
                    {seat.isMutedByHost ? (
                      <span className="text-[7px] px-1 py-0.5 rounded bg-red-900/60 text-red-200 font-mono scale-90" title="Muted by Host">
                        🚫 MUTED
                      </span>
                    ) : seat.isMicActive ? (
                      <span className="flex items-center gap-0.5 text-green-400 scale-90" title="Mic is On">
                        <Mic className="w-2.5 h-2.5" />
                        {isMeOnThisSeat && myMicVolume > 0 && (
                          <span className="text-[7px] font-mono font-bold">{myMicVolume}%</span>
                        )}
                      </span>
                    ) : (
                      <MicOff className="w-2.5 h-2.5 text-white/30 scale-90" />
                    )}

                    {seat.isCameraActive ? (
                      <Camera className="w-2.5 h-2.5 text-cyan-400 scale-90" />
                    ) : (
                      <CameraOff className="w-2.5 h-2.5 text-white/30 scale-90" />
                    )}
                  </div>

                  {/* Host Controls Panel on Seat */}
                  {isHost && !isMeOnThisSeat && (
                    <div className="pt-1 border-t border-white/5 mt-1 flex items-center justify-center gap-1">
                      {/* Host Mute/Unmute toggle */}
                      <button
                        type="button"
                        onClick={() => handleHostToggleMute(index)}
                        className={`p-0.5 rounded bg-black/50 border hover:bg-slate-800 transition-colors ${
                          seat.isMutedByHost ? "border-green-500/30 text-green-400" : "border-red-500/30 text-red-400"
                        }`}
                        title={seat.isMutedByHost ? "Unmute Member" : "Mute Member"}
                      >
                        {seat.isMutedByHost ? <Volume2 className="w-2.5 h-2.5" /> : <VolumeX className="w-2.5 h-2.5" />}
                      </button>

                      {/* Host Kick from mic */}
                      <button
                        type="button"
                        onClick={() => handleHostKick(index)}
                        className="p-0.5 rounded bg-black/50 border border-red-500/30 text-red-400 hover:bg-red-950/40 transition-colors"
                        title="Remove from Mic"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}

                  {/* Compact direct-comment form on the seat card itself */}
                  <div className="w-full pt-1 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const input = form.elements.namedItem("seatChatInput") as HTMLInputElement;
                        const msgVal = input.value.trim();
                        if (!msgVal) return;
                        
                        // Check for Bengali letters to warn them if it's Bengali (English academy rule)
                        const hasBengali = /[\u0980-\u09FF]/.test(msgVal);
                        if (hasBengali) {
                          alert("❌ ভুল ভাষা! এখানে শুধু ইংলিশে আড্ডা দেওয়া যাবে। অন্য ভাষা ব্যবহার করলে আইডি ব্যান করা হবে! (Only English conversation is allowed!)");
                          return;
                        }

                        const timestamp = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
                        const textToSend = `@${seat.userName} ${msgVal}`;
                        const userMsg = {
                          user: userProfile.name || "User",
                          message: textToSend,
                          timestamp,
                          level: userProfile.level || 1,
                          levelColor: "#d2bbff",
                          avatarColor: userProfile.avatarColor || "#d2bbff",
                          photoUrl: userProfile.photoUrl || "",
                          isGift: false,
                          createdAt: Date.now(),
                        };

                        try {
                          await addDoc(collection(db, "rooms", roomId, "messages"), userMsg);
                          input.value = "";
                        } catch (err) {
                          console.error("Firestore post direct seat comment error:", err);
                        }
                      }}
                      className="flex items-center bg-black/50 border border-white/5 rounded px-1 py-0.5"
                    >
                      <input
                        name="seatChatInput"
                        type="text"
                        placeholder="কমেন্ট..."
                        className="flex-1 bg-transparent text-[7px] text-white focus:outline-none placeholder-white/20 min-w-0"
                      />
                      <button
                        type="submit"
                        className="text-[7px] text-pink-400 hover:text-pink-300 font-extrabold px-0.5 transition-colors"
                      >
                        ✓
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleTakeSeat(index)}
                  disabled={actionLoading}
                  className="w-full py-1 px-1.5 bg-gradient-to-r from-pink-600/20 to-purple-600/20 hover:from-pink-600 hover:to-purple-600 border border-pink-500/20 text-white rounded-lg font-bold text-[8px] sm:text-[9px] transition-all flex items-center justify-center gap-0.5 mt-1 shrink-0"
                >
                  <Plus className="w-2 h-2" />
                  <span>যুক্ত হোন</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
