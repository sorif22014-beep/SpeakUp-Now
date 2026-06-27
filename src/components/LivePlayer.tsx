/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from "react";
import { LiveRoom, FloatingReaction } from "../types";
import { Play, Pause, Volume2, VolumeX, Camera, Monitor, Settings, Maximize2, Users, Heart } from "lucide-react";

interface LivePlayerProps {
  room: LiveRoom;
  floatingReactions: FloatingReaction[];
  onAddReaction: (icon: string) => void;
  isWebcamActive: boolean;
  onToggleWebcam: () => void;
}

export default function LivePlayer({
  room,
  floatingReactions,
  onAddReaction,
  isWebcamActive,
  onToggleWebcam,
}: LivePlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [activeFilter, setActiveFilter] = useState<"none" | "cyber" | "cozy" | "neon" | "monochrome">("cyber");
  const [volume, setVolume] = useState(80);
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Manage webcam stream
  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isWebcamActive) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 1280, height: 720 }, audio: false })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
            videoRef.current.play().catch((err) => console.log("Video play error:", err));
          }
          setWebcamError(null);
        })
        .catch((err) => {
          console.error("Camera access failed:", err);
          setWebcamError("Camera access denied or unavailable. Falling back to digital avatar.");
          onToggleWebcam(); // Toggle off
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isWebcamActive]);

  // Canvas animated background generator (cinematic themes + visualizers)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let frame = 0;

    // Set high-res backing
    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * (window.devicePixelRatio || 1);
      canvas.height = rect.height * (window.devicePixelRatio || 1);
    };
    resizeCanvas();

    // Create particles
    const particles: Array<{ x: number; y: number; speedY: number; size: number; color: string; phase: number }> = [];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * 800,
        y: Math.random() * 450,
        speedY: -Math.random() * 0.8 - 0.2,
        size: Math.random() * 3 + 1,
        color: i % 2 === 0 ? "#7c3aed" : "#00a2e6",
        phase: Math.random() * Math.PI * 2,
      });
    }

    const render = () => {
      frame++;
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (!isPlaying) {
        // Paused Screen Overlay
        ctx.fillStyle = "rgba(12, 14, 23, 0.95)";
        ctx.fillRect(0, 0, w, h);
        ctx.font = "bold 24px Inter, sans-serif";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.fillText("STREAM PAUSED", w / 2, h / 2);
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      // 1. Draw base backgrounds if webcam is inactive
      if (!isWebcamActive) {
        if (room.streamType === "cyber") {
          // Cyberpunk Grid + Waves
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, "#0c0a15");
          grad.addColorStop(0.5, "#180c30");
          grad.addColorStop(1, "#3c0042");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Grid horizon perspective
          ctx.strokeStyle = "rgba(124, 58, 237, 0.15)";
          ctx.lineWidth = 1;
          const gridY = h * 0.6;
          
          // Horizontal perspective lines
          for (let i = 0; i < 15; i++) {
            const py = gridY + (Math.pow(i / 15, 2.5) * (h - gridY));
            ctx.beginPath();
            ctx.moveTo(0, py);
            ctx.lineTo(w, py);
            ctx.stroke();
          }

          // Vertical lines spreading from center
          const centerX = w / 2;
          for (let i = -10; i <= 10; i++) {
            ctx.beginPath();
            ctx.moveTo(centerX + i * (w / 40), gridY);
            ctx.lineTo(centerX + i * (w / 8), h);
            ctx.stroke();
          }

          // Draw Glowing Sun
          const sunGrad = ctx.createLinearGradient(w / 2, h * 0.1, w / 2, gridY);
          sunGrad.addColorStop(0, "#ff007f");
          sunGrad.addColorStop(0.6, "#7c3aed");
          sunGrad.addColorStop(1, "rgba(29, 31, 41, 0)");
          ctx.fillStyle = sunGrad;
          ctx.beginPath();
          ctx.arc(w / 2, gridY, h * 0.35, Math.PI, 0, false);
          ctx.fill();

          // Synthwave Horizon Lines cutout (horizontal lines across the sun)
          ctx.fillStyle = "#0c0a15";
          for (let y = h * 0.25; y < gridY; y += 14) {
            const barHeight = 2 + (y - h * 0.2) * 0.08;
            ctx.fillRect(w / 2 - h * 0.4, y, h * 0.8, barHeight);
          }

          // Floating neon cube elements
          ctx.fillStyle = "rgba(0, 162, 230, 0.4)";
          particles.forEach((p, idx) => {
            const px = (p.x / 800) * w;
            const py = (p.y / 450) * h;
            ctx.fillRect(px + Math.sin(frame * 0.02 + idx) * 10, py, p.size * 3, p.size * 3);
            p.y += p.speedY * 1.5;
            if (p.y < 0) p.y = h;
          });

        } else if (room.streamType === "ambient") {
          // Cozy rain lofi stream
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, "#0a0a16");
          grad.addColorStop(0.5, "#10162e");
          grad.addColorStop(1, "#182042");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Starry sky
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          particles.forEach((p, idx) => {
            const px = (p.x / 800) * w;
            const py = (p.y / 450) * h;
            const starOpacity = 0.3 + Math.sin(frame * 0.05 + idx) * 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.1, starOpacity)})`;
            ctx.beginPath();
            ctx.arc(px, py, p.size * 0.6, 0, Math.PI * 2);
            ctx.fill();
          });

          // Soft ambient circular visualizer
          ctx.strokeStyle = "rgba(137, 206, 255, 0.2)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const cx = w / 2;
          const cy = h / 2 - 20;
          const baseRadius = h * 0.25;
          ctx.arc(cx, cy, baseRadius, 0, Math.PI * 2);
          ctx.stroke();

          // Animated waveforms around the circle
          ctx.strokeStyle = "#89ceff";
          ctx.beginPath();
          for (let theta = 0; theta < Math.PI * 2; theta += 0.05) {
            const wave = Math.sin(theta * 10 + frame * 0.05) * Math.cos(theta * 5 - frame * 0.02) * 8;
            const r = baseRadius + wave;
            const x = cx + Math.cos(theta) * r;
            const y = cy + Math.sin(theta) * r;
            if (theta === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();

          // Draw neon coffee/cat graphic center
          ctx.font = `${Math.floor(h * 0.08)}px sans-serif`;
          ctx.textAlign = "center";
          ctx.fillText("🐱☕", cx, cy + 10);

        } else if (room.streamType === "retro") {
          // Retro Synth soundwave tunnels
          ctx.fillStyle = "#0c0e17";
          ctx.fillRect(0, 0, w, h);

          const limit = 8;
          ctx.strokeStyle = "rgba(210, 187, 255, 0.25)";
          ctx.lineWidth = 1.5;

          for (let i = 1; i <= limit; i++) {
            const scale = (i + (frame % 30) / 30) / limit;
            const rw = w * 0.65 * scale;
            const rh = h * 0.65 * scale;
            const rx = (w - rw) / 2;
            const ry = (h - rh) / 2;

            ctx.strokeStyle = `rgba(124, 58, 237, ${0.8 * (1 - scale)})`;
            ctx.strokeRect(rx, ry, rw, rh);
          }

          // Equalizer bar graphs at bottom
          const barCount = 32;
          const barWidth = w / barCount;
          ctx.fillStyle = "rgba(0, 162, 230, 0.6)";
          for (let i = 0; i < barCount; i++) {
            const barH = Math.abs(Math.sin(i * 0.3 + frame * 0.1) * Math.cos(i * 0.1 + frame * 0.03)) * (h * 0.35);
            ctx.fillRect(i * barWidth + 2, h - barH, barWidth - 4, barH);
          }
        } else {
          // ASMR or Default Visualizer
          const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, w * 0.6);
          grad.addColorStop(0, "#191b24");
          grad.addColorStop(0.6, "#11131c");
          grad.addColorStop(1, "#0c0e17");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Draw ripple soundwaves
          for (let i = 0; i < 4; i++) {
            const cycle = (frame + i * 80) % 320;
            const radius = (cycle / 320) * h * 0.6;
            const opacity = 1 - (cycle / 320);
            ctx.strokeStyle = `rgba(255, 178, 183, ${opacity * 0.4})`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
            ctx.stroke();
          }

          // Sparkly stars drifting down
          ctx.fillStyle = "#ffb2b7";
          particles.forEach((p) => {
            const px = (p.x / 800) * w;
            const py = (p.y / 450) * h;
            ctx.beginPath();
            ctx.arc(px, py, p.size * 0.8, 0, Math.PI * 2);
            ctx.fill();
            p.y += p.speedY * 0.5;
            if (p.y < 0) p.y = h;
          });
        }
      }

      // 2. Draw webcam camera feed and add filter overlays
      if (isWebcamActive && videoRef.current) {
        try {
          ctx.drawImage(videoRef.current, 0, 0, w, h);

          // Add interactive filter tint
          if (activeFilter === "cyber") {
            ctx.fillStyle = "rgba(124, 58, 237, 0.06)";
            ctx.fillRect(0, 0, w, h);
            
            // Neon HUD borders
            ctx.strokeStyle = "#d2bbff";
            ctx.lineWidth = 3;
            ctx.beginPath();
            // Top-left bracket
            ctx.moveTo(30, 60); ctx.lineTo(30, 30); ctx.lineTo(60, 30);
            // Top-right bracket
            ctx.moveTo(w - 60, 30); ctx.lineTo(w - 30, 30); ctx.lineTo(w - 30, 60);
            // Bottom-left bracket
            ctx.moveTo(30, h - 60); ctx.lineTo(30, h - 30); ctx.lineTo(60, h - 30);
            // Bottom-right bracket
            ctx.moveTo(w - 60, h - 30); ctx.lineTo(w - 30, h - 30); ctx.lineTo(w - 30, h - 60);
            ctx.stroke();

            // Scrolling scanlines
            ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
            for (let y = frame % 40; y < h; y += 40) {
              ctx.fillRect(0, y, w, 2);
            }

            // HUD metadata
            ctx.font = "12px monospace";
            ctx.fillStyle = "#89ceff";
            ctx.textAlign = "left";
            ctx.fillText("CAM_STREAM_A // GLASSMORPH_ACTIVE", 40, 50);
            ctx.textAlign = "right";
            ctx.fillText(`FPS: 60 // BITRATE: 5820 KBPS`, w - 40, 50);

          } else if (activeFilter === "cozy") {
            ctx.fillStyle = "rgba(137, 206, 255, 0.08)";
            ctx.fillRect(0, 0, w, h);
            
            // Soft drift warm sparkles
            ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
            particles.forEach((p) => {
              ctx.beginPath();
              ctx.arc((p.x / 800) * w, (p.y / 450) * h, p.size * 1.5, 0, Math.PI * 2);
              ctx.fill();
            });
          } else if (activeFilter === "neon") {
            ctx.fillStyle = "rgba(255, 0, 127, 0.04)";
            ctx.fillRect(0, 0, w, h);
            
            // Pulse circle outline
            ctx.strokeStyle = "rgba(255, 0, 127, 0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(w / 2, h / 2, Math.abs(Math.sin(frame * 0.01) * 100) + h * 0.2, 0, Math.PI * 2);
            ctx.stroke();
          } else if (activeFilter === "monochrome") {
            // Apply monochrome look via canvas processing or native canvas fallback style
            ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
            ctx.globalCompositeOperation = "color";
            ctx.fillStyle = "#0c0e17";
            ctx.fillRect(0, 0, w, h);
            ctx.globalCompositeOperation = "source-over";
          }
        } catch (e) {
          console.error("Canvas drawing webcam error:", e);
        }
      }

      // 3. Render animated particles/glowing arcs
      // Elegant bottom gradient overlay
      const overlayGrad = ctx.createLinearGradient(0, h * 0.6, 0, h);
      overlayGrad.addColorStop(0, "rgba(17, 19, 28, 0)");
      overlayGrad.addColorStop(1, "rgba(17, 19, 28, 0.8)");
      ctx.fillStyle = overlayGrad;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);

      // Render floating audio waves at the very bottom
      if (isPlaying) {
        ctx.fillStyle = "rgba(124, 58, 237, 0.3)";
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let x = 0; x <= w; x += 10) {
          const waveHeight = Math.sin(x * 0.01 + frame * 0.08) * 12 + Math.cos(x * 0.005 - frame * 0.04) * 6;
          ctx.lineTo(x, h - 15 - waveHeight);
        }
        ctx.lineTo(w, h);
        ctx.closePath();
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    // Handle resize
    const handleResize = () => {
      resizeCanvas();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
    };
  }, [isPlaying, room.streamType, isWebcamActive, activeFilter]);

  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-slate-950 border border-white/10 shadow-2xl group" id="live-player-container">
      {/* Hidden webcam video tag */}
      {isWebcamActive && (
        <video
          ref={videoRef}
          className="hidden"
          playsInline
          muted
          autoPlay
          width="1280"
          height="720"
        />
      )}

      {/* Main rendering canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full block object-cover"
        style={{
          filter: activeFilter === "monochrome" ? "grayscale(100%) contrast(1.2)" : "none",
        }}
      />

      {/* Webcam Failure Overlay */}
      {webcamError && (
        <div className="absolute top-12 left-4 right-4 bg-red-950/90 border border-red-800 text-red-200 text-xs px-3 py-2 rounded-lg flex items-center gap-2 z-30">
          <span>⚠️ {webcamError}</span>
          <button onClick={() => setWebcamError(null)} className="ml-auto underline hover:text-white">Dismiss</button>
        </div>
      )}

      {/* Dynamic Floating Reactions from User Actions */}
      <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
        {floatingReactions.map((reaction) => (
          <div
            key={reaction.id}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 text-4xl animate-bounce-float"
            style={{
              left: `${reaction.x}%`,
              transform: `scale(${reaction.scale})`,
              opacity: 0.8,
              animation: "floatUp 2.8s forwards ease-out",
            }}
          >
            {reaction.icon}
          </div>
        ))}
      </div>

      {/* Ambient Outer Glowing Rings Overlay */}
      <div className="absolute inset-0 border border-white/5 pointer-events-none rounded-2xl shadow-[inset_0_0_80px_rgba(124,58,237,0.15)]" />

      {/* Top HUD overlay (Pulsing badge, details) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-red-600 text-white font-mono text-xs font-extrabold flex items-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.5)] animate-pulse">
            <span className="w-2 h-2 rounded-full bg-white block animate-ping" />
            LIVE
          </div>
          <div className="px-3 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white font-mono text-xs flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-cyan-400" />
            <span>{room.viewerCount.toLocaleString()} watching</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pointer-events-auto">
          {/* Active filter pills if camera is streaming */}
          {isWebcamActive && (
            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/10">
              <span className="text-[10px] text-white/60 font-mono px-1">Filter:</span>
              {(["cyber", "cozy", "neon", "monochrome"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`text-[10px] uppercase px-1.5 py-0.5 rounded-full font-bold transition-all ${
                    activeFilter === f
                      ? "bg-purple-600 text-white shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                      : "text-white/60 hover:text-white"
                  }`}
                >
                  {f === "monochrome" ? "B&W" : f}
                </button>
              ))}
            </div>
          )}

          <div className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md border border-white/10 text-white font-mono text-xs capitalize">
            Category: {room.category}
          </div>
        </div>
      </div>

      {/* Hover Control Bar - glassmorphic layout */}
      <div className="absolute bottom-4 left-4 right-4 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="w-10 h-10 rounded-full bg-purple-600 hover:bg-purple-500 flex items-center justify-center text-white transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"
            title={isPlaying ? "Pause Stream" : "Play Stream"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
          </button>

          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 rounded-lg hover:bg-white/10 text-white transition-colors"
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
          </button>

          {/* Volume Slider */}
          <div className="w-20 flex items-center gap-1.5">
            <input
              type="range"
              min="0"
              max="100"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                if (isMuted) setIsMuted(false);
              }}
              className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer accent-purple-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Webcam simulation */}
          <button
            onClick={onToggleWebcam}
            className={`px-3 py-1.5 rounded-lg border font-medium text-xs flex items-center gap-1.5 transition-all ${
              isWebcamActive
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(0,162,230,0.25)]"
                : "bg-white/5 hover:bg-white/10 text-white border-white/10"
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>{isWebcamActive ? "Switch to Digital Preset" : "Simulate Live Camera"}</span>
          </button>

          <button
            onClick={() => onAddReaction("❤️")}
            className="p-2 rounded-lg bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/30 text-pink-300 flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            title="Send Love Heart"
          >
            <Heart className="w-4 h-4 fill-current" />
          </button>

          <button className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Styled inline custom keyframe animations for floating bubbles/reactions */}
      <style>{`
        @keyframes floatUp {
          0% {
            transform: translateY(0) scale(0.6);
            opacity: 1;
          }
          10% {
            opacity: 1;
          }
          100% {
            transform: translateY(-380px) translateX(var(--drift-x, 30px)) scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
