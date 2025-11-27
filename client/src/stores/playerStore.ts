import { create } from "zustand";
import { PlayerSpell, SpellTemplate } from "../../../shared/spells";

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

export interface InventoryItem {
  itemId: string;
  name: string;
  icon: string;
  quantity: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  durability?: number;
  maxDurability?: number;
  description?: string;
}

export interface InventoryState {
  slots: (InventoryItem | null)[];
  maxSlots: number;
}

export interface SpellbookState {
  spells: PlayerSpell[];
  availableSpells: Record<string, SpellTemplate>;
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
  inventory: InventoryState;
  spellbook: SpellbookState;
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
  updateInventory: (inventory: InventoryState) => void;
  addInventoryItem: (slot: number, item: InventoryItem) => void;
  removeInventoryItem: (slot: number) => void;
  updateInventoryItem: (slot: number, updates: Partial<InventoryItem>) => void;
  updateSpellbook: (spellbook: SpellbookState) => void;
  addSpell: (spell: PlayerSpell) => void;
  updateSpell: (spellId: string, updates: Partial<PlayerSpell>) => void;
  setSpellCooldown: (spellId: string, cooldownUntil: number) => void;
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
  inventory: {
    slots: new Array(32).fill(null),
    maxSlots: 32,
  },
  spellbook: {
    spells: [],
    availableSpells: {},
  },

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

  updateInventory: (inventory) => set({ inventory }),

  addInventoryItem: (slot, item) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        slots: state.inventory.slots.map((existingItem, index) =>
          index === slot ? item : existingItem
        ),
      },
    })),

  removeInventoryItem: (slot) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        slots: state.inventory.slots.map((existingItem, index) =>
          index === slot ? null : existingItem
        ),
      },
    })),

  updateInventoryItem: (slot, updates) =>
    set((state) => ({
      inventory: {
        ...state.inventory,
        slots: state.inventory.slots.map((existingItem, index) =>
          index === slot && existingItem
            ? { ...existingItem, ...updates }
            : existingItem
        ),
      },
    })),

  updateSpellbook: (spellbook) => set({ spellbook }),

  addSpell: (spell) =>
    set((state) => ({
      spellbook: {
        ...state.spellbook,
        spells: [...state.spellbook.spells, spell],
      },
    })),

  updateSpell: (spellId, updates) =>
    set((state) => ({
      spellbook: {
        ...state.spellbook,
        spells: state.spellbook.spells.map((spell) =>
          spell.spellId === spellId ? { ...spell, ...updates } : spell
        ),
      },
    })),

  setSpellCooldown: (spellId, cooldownUntil) =>
    set((state) => ({
      spellbook: {
        ...state.spellbook,
        spells: state.spellbook.spells.map((spell) =>
          spell.spellId === spellId ? { ...spell, cooldownUntil } : spell
        ),
      },
    })),
}));
