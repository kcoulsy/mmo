// Item templates and data definitions

// TODO these will go in the db

export interface ItemTemplate {
  id: string;
  name: string;
  description?: string;
  type: "crafting_material" | "consumable" | "equipment" | "weapon" | "armor";
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  level: number;
  stats?: ItemStats;
  durability?: number;
  maxDurability?: number;
  stackable: boolean;
  maxStack?: number;
  value: number; // gold value
  icon?: string; // emoji or sprite ID
}

export interface ItemStats {
  hp?: number;
  maxHp?: number;
  mp?: number;
  maxMp?: number;
  attack?: number;
  defense?: number;
  moveSpeed?: number;
  // Add more stats as needed
}

// Crafting Materials
export const CRAFTING_MATERIALS: Record<string, ItemTemplate> = {
  copper_ore: {
    id: "copper_ore",
    name: "Copper Ore",
    description: "A chunk of raw copper ore",
    type: "crafting_material",
    rarity: "common",
    level: 1,
    stackable: true,
    maxStack: 50,
    value: 5,
    icon: "🪨",
  },
  iron_ore: {
    id: "iron_ore",
    name: "Iron Ore",
    description: "A chunk of raw iron ore",
    type: "crafting_material",
    rarity: "common",
    level: 5,
    stackable: true,
    maxStack: 40,
    value: 10,
    icon: "⚒️",
  },
  gold_ore: {
    id: "gold_ore",
    name: "Gold Ore",
    description: "A chunk of raw gold ore",
    type: "crafting_material",
    rarity: "uncommon",
    level: 15,
    stackable: true,
    maxStack: 30,
    value: 25,
    icon: "✨",
  },
  peacebloom: {
    id: "peacebloom",
    name: "Peacebloom",
    description: "A calming herb",
    type: "crafting_material",
    rarity: "common",
    level: 1,
    stackable: true,
    maxStack: 50,
    value: 3,
    icon: "🌿",
  },
  silverleaf: {
    id: "silverleaf",
    name: "Silverleaf",
    description: "A shimmering herb",
    type: "crafting_material",
    rarity: "common",
    level: 5,
    stackable: true,
    maxStack: 40,
    value: 7,
    icon: "🌱",
  },
};

// Consumables
export const CONSUMABLES: Record<string, ItemTemplate> = {
  health_potion: {
    id: "health_potion",
    name: "Health Potion",
    description: "Restores 50 HP",
    type: "consumable",
    rarity: "common",
    level: 1,
    stats: { hp: 50 },
    stackable: true,
    maxStack: 20,
    value: 15,
    icon: "🧪",
  },
  mana_potion: {
    id: "mana_potion",
    name: "Mana Potion",
    description: "Restores 30 MP",
    type: "consumable",
    rarity: "common",
    level: 1,
    stats: { mp: 30 },
    stackable: true,
    maxStack: 20,
    value: 20,
    icon: "💙",
  },
  greater_health_potion: {
    id: "greater_health_potion",
    name: "Greater Health Potion",
    description: "Restores 150 HP",
    type: "consumable",
    rarity: "uncommon",
    level: 10,
    stats: { hp: 150 },
    stackable: true,
    maxStack: 15,
    value: 75,
    icon: "🧪",
  },
};

// Equipment - Weapons
export const WEAPONS: Record<string, ItemTemplate> = {
  wooden_sword: {
    id: "wooden_sword",
    name: "Wooden Sword",
    description: "A basic wooden sword",
    type: "weapon",
    rarity: "common",
    level: 1,
    stats: { attack: 5 },
    durability: 50,
    maxDurability: 50,
    stackable: false,
    value: 25,
    icon: "🗡️",
  },
  iron_sword: {
    id: "iron_sword",
    name: "Iron Sword",
    description: "A sturdy iron sword",
    type: "weapon",
    rarity: "common",
    level: 5,
    stats: { attack: 12 },
    durability: 100,
    maxDurability: 100,
    stackable: false,
    value: 100,
    icon: "⚔️",
  },
  shadowstrike_dagger: {
    id: "shadowstrike_dagger",
    name: "Shadowstrike Dagger",
    description: "A dagger imbued with shadow magic",
    type: "weapon",
    rarity: "epic",
    level: 20,
    stats: { attack: 35 },
    durability: 200,
    maxDurability: 200,
    stackable: false,
    value: 1000,
    icon: "🗡️",
  },
};

// Equipment - Armor
export const ARMOR: Record<string, ItemTemplate> = {
  leather_armor: {
    id: "leather_armor",
    name: "Leather Armor",
    description: "Basic leather protection",
    type: "armor",
    rarity: "common",
    level: 3,
    stats: { defense: 8 },
    durability: 75,
    maxDurability: 75,
    stackable: false,
    value: 50,
    icon: "🛡️",
  },
  iron_armor: {
    id: "iron_armor",
    name: "Iron Armor",
    description: "Heavy iron plate armor",
    type: "armor",
    rarity: "rare",
    level: 10,
    stats: { defense: 20 },
    durability: 150,
    maxDurability: 150,
    stackable: false,
    value: 300,
    icon: "🛡️",
  },
};

// Utility items
export const UTILITY: Record<string, ItemTemplate> = {
  lockpick: {
    id: "lockpick",
    name: "Lockpick",
    description: "Used for opening locked containers",
    type: "equipment",
    rarity: "common",
    level: 1,
    stackable: true,
    maxStack: 50,
    value: 2,
    icon: "🔓",
  },
  smoke_bomb: {
    id: "smoke_bomb",
    name: "Smoke Bomb",
    description: "Creates a smoke cloud for escape",
    type: "consumable",
    rarity: "uncommon",
    level: 5,
    stackable: true,
    maxStack: 10,
    value: 50,
    icon: "💣",
  },
  poison_vial: {
    id: "poison_vial",
    name: "Poison Vial",
    description: "Deadly poison for weapons",
    type: "consumable",
    rarity: "uncommon",
    level: 8,
    stackable: true,
    maxStack: 5,
    value: 80,
    icon: "☠️",
  },
  ancient_rune: {
    id: "ancient_rune",
    name: "Ancient Rune",
    description: "A mysterious magical rune",
    type: "equipment",
    rarity: "legendary",
    level: 25,
    stackable: false,
    value: 2000,
    icon: "📜",
  },
};

// Combined item templates
export const ITEM_TEMPLATES: Record<string, ItemTemplate> = {
  ...CRAFTING_MATERIALS,
  ...CONSUMABLES,
  ...WEAPONS,
  ...ARMOR,
  ...UTILITY,
};

// Helper functions
export function getItemTemplate(itemId: string): ItemTemplate | undefined {
  return ITEM_TEMPLATES[itemId];
}

export function getItemsByType(type: string): ItemTemplate[] {
  return Object.values(ITEM_TEMPLATES).filter((item) => item.type === type);
}

export function getItemsByRarity(rarity: string): ItemTemplate[] {
  return Object.values(ITEM_TEMPLATES).filter((item) => item.rarity === rarity);
}

export function getItemsByLevelRange(
  minLevel: number,
  maxLevel: number
): ItemTemplate[] {
  return Object.values(ITEM_TEMPLATES).filter(
    (item) => item.level >= minLevel && item.level <= maxLevel
  );
}
