import { create } from "zustand";

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  level: number;
  experience: number;
  experienceToNext: number;
}

export interface Tradeskill {
  name: string;
  level: number;
  experience: number;
  experienceToNext: number;
  icon: string;
}

export interface TargetInfo {
  entityId: string;
  name: string;
  type: "player" | "npc" | "monster";
  level?: number;
  hp?: number;
  maxHp?: number;
  position: { x: number; y: number; z?: number };
}

export interface PlayerState {
  id: string;
  name: string;
  stats: PlayerStats;
  position: { x: number; y: number; z: number };
  isConnected: boolean;
  isLocal: boolean;
  target?: TargetInfo | null;
  tradeskills: Tradeskill[];
}

interface PlayerStore extends PlayerState {
  setPlayer: (player: Partial<PlayerState>) => void;
  updateStats: (stats: Partial<PlayerStats>) => void;
  updatePosition: (position: { x: number; y: number; z: number }) => void;
  setConnected: (connected: boolean) => void;
  setTarget: (target: TargetInfo | null) => void;
  clearTarget: () => void;
  takeDamage: (damage: number) => void;
  heal: (amount: number) => void;
  gainExperience: (amount: number) => void;
  updateTradeskill: (skillName: string, updates: Partial<Tradeskill>) => void;
  gainTradeskillExperience: (skillName: string, amount: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  id: "",
  name: "Player",
  stats: {
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    attack: 10,
    defense: 5,
    moveSpeed: 100,
    level: 1,
    experience: 0,
    experienceToNext: 100,
  },
  position: { x: 400, y: 300, z: 0 },
  isConnected: false,
  isLocal: true,
  target: null,
  tradeskills: [
    {
      name: "Mining",
      level: 1,
      experience: 0,
      experienceToNext: 100,
      icon: "⛏️",
    },
    {
      name: "Woodcutting",
      level: 1,
      experience: 0,
      experienceToNext: 100,
      icon: "🪓",
    },
    {
      name: "Herbalism",
      level: 1,
      experience: 0,
      experienceToNext: 100,
      icon: "🌿",
    },
  ],

  setPlayer: (player) => set((state) => ({ ...state, ...player })),

  updateStats: (stats) =>
    set((state) => ({
      stats: { ...state.stats, ...stats },
    })),

  updatePosition: (position) => set({ position }),

  setConnected: (isConnected) => set({ isConnected }),

  setTarget: (target) => set({ target }),

  clearTarget: () => set({ target: null }),

  takeDamage: (damage) =>
    set((state) => ({
      stats: {
        ...state.stats,
        hp: Math.max(0, state.stats.hp - damage),
      },
    })),

  heal: (amount) =>
    set((state) => ({
      stats: {
        ...state.stats,
        hp: Math.min(state.stats.maxHp, state.stats.hp + amount),
      },
    })),

  gainExperience: (amount) =>
    set((state) => {
      const newExp = state.stats.experience + amount;
      const newLevel = Math.floor(newExp / 100) + 1;
      const expForNextLevel = newLevel * 100;

      return {
        stats: {
          ...state.stats,
          experience: newExp,
          level: newLevel,
          experienceToNext: expForNextLevel,
        },
      };
    }),

  updateTradeskill: (skillName, updates) =>
    set((state) => ({
      tradeskills: state.tradeskills.map((skill) =>
        skill.name === skillName ? { ...skill, ...updates } : skill
      ),
    })),

  gainTradeskillExperience: (skillName, amount) =>
    set((state) => ({
      tradeskills: state.tradeskills.map((skill) => {
        if (skill.name !== skillName) return skill;

        const newExp = skill.experience + amount;
        const newLevel = Math.floor(newExp / 100) + 1;
        const expForNextLevel = newLevel * 100;

        return {
          ...skill,
          experience: newExp,
          level: newLevel,
          experienceToNext: expForNextLevel,
        };
      }),
    })),
}));
