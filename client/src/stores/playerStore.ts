import { create } from 'zustand';

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

export interface PlayerState {
  id: string;
  name: string;
  stats: PlayerStats;
  position: { x: number; y: number; z: number };
  isConnected: boolean;
  isLocal: boolean;
}

interface PlayerStore extends PlayerState {
  setPlayer: (player: Partial<PlayerState>) => void;
  updateStats: (stats: Partial<PlayerStats>) => void;
  updatePosition: (position: { x: number; y: number; z: number }) => void;
  setConnected: (connected: boolean) => void;
  takeDamage: (damage: number) => void;
  heal: (amount: number) => void;
  gainExperience: (amount: number) => void;
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  id: '',
  name: 'Player',
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

  setPlayer: (player) => set((state) => ({ ...state, ...player })),

  updateStats: (stats) => set((state) => ({
    stats: { ...state.stats, ...stats }
  })),

  updatePosition: (position) => set({ position }),

  setConnected: (isConnected) => set({ isConnected }),

  takeDamage: (damage) => set((state) => ({
    stats: {
      ...state.stats,
      hp: Math.max(0, state.stats.hp - damage)
    }
  })),

  heal: (amount) => set((state) => ({
    stats: {
      ...state.stats,
      hp: Math.min(state.stats.maxHp, state.stats.hp + amount)
    }
  })),

  gainExperience: (amount) => set((state) => {
    const newExp = state.stats.experience + amount;
    const newLevel = Math.floor(newExp / 100) + 1;
    const expForNextLevel = newLevel * 100;

    return {
      stats: {
        ...state.stats,
        experience: newExp,
        level: newLevel,
        experienceToNext: expForNextLevel
      }
    };
  }),
}));

