/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LiveRoom, GiftItem, UserLevel } from "./types";

export const MOCK_ROOMS: LiveRoom[] = [];

export const GIFT_ITEMS: GiftItem[] = [
  {
    id: "neon-heart",
    name: "Neon Heart",
    cost: 10,
    icon: "💖",
    color: "#ff007f",
    effectType: "heart",
    description: "Send dynamic pink pulsing hearts floating up the screen!",
  },
  {
    id: "cyber-cocktail",
    name: "Cyber Elixir",
    cost: 50,
    icon: "🍹",
    color: "#00f0ff",
    effectType: "cocktail",
    description: "Toast to the stream with a vibrant cybernetic neon cocktail.",
  },
  {
    id: "portal-ring",
    name: "Neon Ring Portal",
    cost: 200,
    icon: "🌀",
    color: "#a020f0",
    effectType: "portal",
    description: "An infinite matrix portal. Triggers ambient space rings.",
  },
  {
    id: "space-rocket",
    name: "Apex Rocket",
    cost: 1000,
    icon: "🚀",
    color: "#ffaa00",
    effectType: "rocket",
    description: "Blast off! Shoots a huge animated orbital rocket up the stream.",
  },
  {
    id: "galaxy-crown",
    name: "Cosmic Crown",
    cost: 5000,
    icon: "👑",
    color: "#e0a6ff",
    effectType: "crown",
    description: "Full screen cosmic crown overlay with shooting stardust!",
  }
];

export const RANDOM_USERNAMES = [
  "GlitchMaster", "KittenMage", "RetroVolt", "PixelPioneer", "CyberSamurai",
  "ZenVibes", "StarryNight", "Luna_Phase", "SolarWind", "NebulaKnight",
  "SyntaxError", "HyperDrive", "QuantumLeap", "SubZero", "NeonGhost",
  "EchoChamber", "AeroVelo", "AcidRain", "BinaryStar", "CosmicNoodle",
  "PixelWitch", "Vapor_Wave99", "GigaWatt", "LofiPanda", "AetherBound"
];

export const MOCK_CHATS_BY_TYPE: Record<string, string[]> = {
  cyber: [
    "This bassline is absolutely mental!! 🔥",
    "Neo-Tokyo vibes are off the charts tonight",
    "Who is listening to this while compiling code? 💻",
    "DROP THE BASS VoxelPulse!",
    "LEVEL UP!! Congrats to whoever just gifted! 🙌",
    "Where is this set taking place? Real location?",
    "That lighting looks incredible, great camera setup",
    "Cyberpunk is not dead, it's alive in this stream!",
    "Is there a tracklist anywhere?",
    "Oh my god, this transition was so smooth!",
    "Pure cyber energy. Absolute masterpiece"
  ],
  ambient: [
    "Perfect music to study for my exams tomorrow 📚",
    "The rain sound is so cozy, makes me want to sleep",
    "LofiNeko streams are the highlight of my week",
    "Sending positive energy to everyone in the chat! ✨",
    "Is that a real cat sleeping in the background?",
    "What kind of coffee is everyone drinking?",
    "This beats selection is exceptionally warm",
    "I've had this tab open for 6 hours straight",
    "Relaxation levels reached 100%",
    "Can we appreciate how cute the avatar is? 🐱"
  ],
  retro: [
    "Take me back to the 1980s! 🕹️",
    "Reminds me of driving through Miami at midnight",
    "The synthesizers are crying, this is beautiful",
    "Who else is here from the synthwave community?",
    "Outstanding track! Is this on Spotify?",
    "Can we get some laser lights on screen? ⚡",
    "This is making my coding workflow go twice as fast",
    "Vaporwave aesthetics forever!",
    "Absolute banger track playing right now"
  ],
  visualizer: [
    "The audio visualizer is so hypnotic to watch 🌀",
    "I'm wearing headphones and the 3D audio is wild",
    "So relaxing... instantly cleared my headache",
    "Does anyone else hear that subtle whispering?",
    "Beautiful colors on the visualizer!",
    "This rain recording is high-fidelity",
    "Using this for my daily meditation routine",
    "Unbelievably tranquil. Thanks for streaming!"
  ],
  camera: [
    "Whoa! Is that a live webcam feed?",
    "Love the custom webcam filter overlay!",
    "Stream quality is clean, looks super professional",
    "Awesome overlay, how did you build that visual feedback?",
    "Hello from the other side of the world! 👋",
    "You look great today! Epic streams",
    "Can we see the setup behind the camera?",
    "Webcam overlay matching the glassmorphic vibes perfectly"
  ]
};
