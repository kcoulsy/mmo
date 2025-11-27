// Shared spell system types for client-server communication

export type SpellType = "instant" | "cast_time" | "channeled" | "projectile";
export type SpellTargetType = "self" | "single_target" | "ground_aoe" | "self_aoe" | "none";
export type EffectTiming = "on_cast_start" | "on_cast_complete" | "on_channel_tick";
export type EffectType = "damage" | "heal" | "buff" | "debuff" | "teleport" | "knockback";
export type DamageSchool = "physical" | "fire" | "frost" | "arcane" | "holy" | "shadow" | "nature";

export interface SpellEffect {
  type: EffectType;
  timing: EffectTiming;

  // Damage/Heal
  baseDamage?: number;
  baseHealing?: number;
  damageSchool?: DamageSchool;

  // Scaling with stats
  attackScaling?: number; // % of attack to add
  intelligenceScaling?: number; // % of intelligence to add

  // Buff/Debuff
  buffType?: string;
  duration?: number; // milliseconds
  statModifiers?: {
    moveSpeed?: number;
    attack?: number;
    defense?: number;
  };

  // AoE
  radius?: number; // pixels
  maxTargets?: number;

  // Teleport
  range?: number;

  // Knockback
  knockbackDistance?: number;
}

export interface SpellTemplate {
  id: string;
  name: string;
  description: string;
  icon?: string;

  // Cast properties
  type: SpellType;
  targetType: SpellTargetType;
  castTime: number; // milliseconds (0 for instant)
  channelDuration?: number; // for channeled spells
  channelTickRate?: number; // how often channel ticks occur

  // Resource costs
  manaCost: number;

  // Cooldown
  cooldown: number; // milliseconds

  // Range and targeting
  range: number; // pixels from caster (0 for self)
  minRange?: number; // minimum range (for some spells)
  requiresTarget: boolean; // Does it need a target to cast?
  canTargetSelf: boolean;
  canTargetAllies: boolean;
  canTargetEnemies: boolean;

  // Level requirements
  levelRequired: number;
  unlocksAtLevel?: number; // Level when player learns this spell

  // Effects
  effects: SpellEffect[];

  // Visual/Audio (future)
  projectileSpeed?: number; // pixels per second
  animationId?: string;
  soundId?: string;
}

export interface PlayerSpell {
  spellId: string;
  level: number;
  experience: number;
  cooldownUntil: number; // timestamp when cooldown expires
}

export interface ActiveSpellEffect {
  id: string;
  spellId: string;
  casterId: string;
  targetEntityId: string;
  effectType: EffectType;
  startTime: number;
  duration: number;
  statModifiers?: {
    moveSpeed?: number;
    attack?: number;
    defense?: number;
  };
}

// Helper functions
export function getSpellTemplate(spellId: string, spells: Record<string, SpellTemplate>): SpellTemplate | undefined {
  return spells[spellId];
}

export function getSpellsByLevelRange(
  minLevel: number,
  maxLevel: number,
  spells: Record<string, SpellTemplate>
): SpellTemplate[] {
  return Object.values(spells).filter(
    (spell) =>
      spell.levelRequired >= minLevel && spell.levelRequired <= maxLevel
  );
}

export function getSpellsUnlockedAtLevel(level: number, spells: Record<string, SpellTemplate>): SpellTemplate[] {
  return Object.values(spells).filter(
    (spell) => spell.unlocksAtLevel === level
  );
}

// ============================================
// SPELL TEMPLATES
// ============================================

// ============================================
// WARRIOR ABILITIES (Physical/Melee)
// ============================================

export const WARRIOR_SPELLS: Record<string, SpellTemplate> = {
  slash: {
    id: "slash",
    name: "Slash",
    description: "A quick melee strike that deals physical damage",
    icon: "⚔️",
    type: "instant",
    targetType: "single_target",
    castTime: 0,
    manaCost: 0,
    cooldown: 1500,
    range: 80,
    requiresTarget: true,
    canTargetSelf: false,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 1,
    unlocksAtLevel: 1,
    effects: [
      {
        type: "damage",
        timing: "on_cast_complete",
        baseDamage: 25,
        damageSchool: "physical",
        attackScaling: 1.2,
      },
    ],
  },

  cleave: {
    id: "cleave",
    name: "Cleave",
    description: "Strikes all enemies in front of you",
    icon: "🪓",
    type: "instant",
    targetType: "self_aoe",
    castTime: 0,
    manaCost: 15,
    cooldown: 6000,
    range: 0,
    requiresTarget: false,
    canTargetSelf: true,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 5,
    unlocksAtLevel: 5,
    effects: [
      {
        type: "damage",
        timing: "on_cast_complete",
        baseDamage: 35,
        damageSchool: "physical",
        attackScaling: 0.8,
        radius: 120,
        maxTargets: 5,
      },
    ],
  },

  whirlwind: {
    id: "whirlwind",
    name: "Whirlwind",
    description: "Spin in a circle, hitting all nearby enemies multiple times",
    icon: "🌪️",
    type: "channeled",
    targetType: "self_aoe",
    castTime: 0,
    channelDuration: 3000,
    channelTickRate: 500,
    manaCost: 40,
    cooldown: 20000,
    range: 0,
    requiresTarget: false,
    canTargetSelf: true,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 10,
    unlocksAtLevel: 10,
    effects: [
      {
        type: "damage",
        timing: "on_channel_tick",
        baseDamage: 15,
        damageSchool: "physical",
        attackScaling: 0.5,
        radius: 100,
        maxTargets: 8,
      },
    ],
  },

  charge: {
    id: "charge",
    name: "Charge",
    description: "Rush to your target, stunning them briefly",
    icon: "💨",
    type: "instant",
    targetType: "single_target",
    castTime: 0,
    manaCost: 20,
    cooldown: 15000,
    range: 300,
    minRange: 100,
    requiresTarget: true,
    canTargetSelf: false,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 8,
    unlocksAtLevel: 8,
    effects: [
      {
        type: "teleport",
        timing: "on_cast_complete",
        range: 300,
      },
      {
        type: "damage",
        timing: "on_cast_complete",
        baseDamage: 20,
        damageSchool: "physical",
        attackScaling: 0.8,
      },
    ],
  },
};

// ============================================
// MAGE ABILITIES (Magical/Ranged)
// ============================================

export const MAGE_SPELLS: Record<string, SpellTemplate> = {
  fireball: {
    id: "fireball",
    name: "Fireball",
    description: "Hurls a ball of fire at your target",
    icon: "🔥",
    type: "cast_time",
    targetType: "single_target",
    castTime: 2000,
    manaCost: 30,
    cooldown: 3000,
    range: 400,
    requiresTarget: true,
    canTargetSelf: false,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 1,
    unlocksAtLevel: 1,
    projectileSpeed: 300,
    effects: [
      {
        type: "damage",
        timing: "on_cast_complete",
        baseDamage: 80,
        damageSchool: "fire",
        intelligenceScaling: 1.5,
      },
    ],
  },

  arcane_blast: {
    id: "arcane_blast",
    name: "Arcane Blast",
    description: "Blasts the target with arcane energy",
    icon: "💫",
    type: "instant",
    targetType: "single_target",
    castTime: 0,
    manaCost: 25,
    cooldown: 2000,
    range: 350,
    requiresTarget: true,
    canTargetSelf: false,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 3,
    unlocksAtLevel: 3,
    effects: [
      {
        type: "damage",
        timing: "on_cast_complete",
        baseDamage: 50,
        damageSchool: "arcane",
        intelligenceScaling: 1.2,
      },
    ],
  },

  ice_shield: {
    id: "ice_shield",
    name: "Ice Shield",
    description: "Surrounds you with an icy barrier, increasing defense",
    icon: "🛡️",
    type: "instant",
    targetType: "self",
    castTime: 0,
    manaCost: 40,
    cooldown: 30000,
    range: 0,
    requiresTarget: false,
    canTargetSelf: true,
    canTargetAllies: false,
    canTargetEnemies: false,
    levelRequired: 5,
    unlocksAtLevel: 5,
    effects: [
      {
        type: "buff",
        timing: "on_cast_complete",
        buffType: "ice_shield",
        duration: 10000,
        statModifiers: {
          defense: 20,
          moveSpeed: -0.2,
        },
      },
    ],
  },

  frost_nova: {
    id: "frost_nova",
    name: "Frost Nova",
    description: "Freezes all nearby enemies in place",
    icon: "❄️",
    type: "instant",
    targetType: "self_aoe",
    castTime: 0,
    manaCost: 35,
    cooldown: 25000,
    range: 0,
    requiresTarget: false,
    canTargetSelf: true,
    canTargetAllies: false,
    canTargetEnemies: true,
    levelRequired: 7,
    unlocksAtLevel: 7,
    effects: [
      {
        type: "damage",
        timing: "on_cast_complete",
        baseDamage: 30,
        damageSchool: "frost",
        intelligenceScaling: 0.8,
        radius: 150,
        maxTargets: 10,
      },
      {
        type: "debuff",
        timing: "on_cast_complete",
        buffType: "frozen",
        duration: 3000,
        radius: 150,
        maxTargets: 10,
        statModifiers: {
          moveSpeed: -0.9,
        },
      },
    ],
  },

  blink: {
    id: "blink",
    name: "Blink",
    description: "Teleport a short distance forward",
    icon: "✨",
    type: "instant",
    targetType: "ground_aoe",
    castTime: 0,
    manaCost: 20,
    cooldown: 15000,
    range: 200,
    requiresTarget: false,
    canTargetSelf: true,
    canTargetAllies: false,
    canTargetEnemies: false,
    levelRequired: 10,
    unlocksAtLevel: 10,
    effects: [
      {
        type: "teleport",
        timing: "on_cast_complete",
        range: 200,
      },
    ],
  },
};

// ============================================
// HEALER ABILITIES (Support/Restoration)
// ============================================

export const HEALER_SPELLS: Record<string, SpellTemplate> = {
  flash_heal: {
    id: "flash_heal",
    name: "Flash Heal",
    description: "Quickly heals your target",
    icon: "✨",
    type: "cast_time",
    targetType: "single_target",
    castTime: 1500,
    manaCost: 30,
    cooldown: 0,
    range: 400,
    requiresTarget: true,
    canTargetSelf: true,
    canTargetAllies: true,
    canTargetEnemies: false,
    levelRequired: 1,
    unlocksAtLevel: 1,
    effects: [
      {
        type: "heal",
        timing: "on_cast_complete",
        baseHealing: 100,
        intelligenceScaling: 1.5,
      },
    ],
  },

  rejuvenation: {
    id: "rejuvenation",
    name: "Rejuvenation",
    description: "Heals your target over time",
    icon: "🌿",
    type: "instant",
    targetType: "single_target",
    castTime: 0,
    manaCost: 25,
    cooldown: 3000,
    range: 400,
    requiresTarget: true,
    canTargetSelf: true,
    canTargetAllies: true,
    canTargetEnemies: false,
    levelRequired: 3,
    unlocksAtLevel: 3,
    effects: [
      {
        type: "buff",
        timing: "on_cast_complete",
        buffType: "rejuvenation",
        duration: 12000,
        baseHealing: 15, // heals every tick
      },
    ],
  },

  divine_shield: {
    id: "divine_shield",
    name: "Divine Shield",
    description: "Protects the target, absorbing damage",
    icon: "🛡️",
    type: "instant",
    targetType: "single_target",
    castTime: 0,
    manaCost: 40,
    cooldown: 30000,
    range: 400,
    requiresTarget: true,
    canTargetSelf: true,
    canTargetAllies: true,
    canTargetEnemies: false,
    levelRequired: 5,
    unlocksAtLevel: 5,
    effects: [
      {
        type: "buff",
        timing: "on_cast_complete",
        buffType: "divine_shield",
        duration: 8000,
        statModifiers: {
          defense: 30,
        },
      },
    ],
  },

  holy_nova: {
    id: "holy_nova",
    name: "Holy Nova",
    description: "Heals all nearby allies",
    icon: "💫",
    type: "instant",
    targetType: "self_aoe",
    castTime: 0,
    manaCost: 50,
    cooldown: 10000,
    range: 0,
    requiresTarget: false,
    canTargetSelf: true,
    canTargetAllies: true,
    canTargetEnemies: false,
    levelRequired: 8,
    unlocksAtLevel: 8,
    effects: [
      {
        type: "heal",
        timing: "on_cast_complete",
        baseHealing: 60,
        intelligenceScaling: 1.0,
        radius: 200,
        maxTargets: 5,
      },
    ],
  },
};

// ============================================
// COMBINED SPELL TEMPLATES
// ============================================

export const SPELL_TEMPLATES: Record<string, SpellTemplate> = {
  ...WARRIOR_SPELLS,
  ...MAGE_SPELLS,
  ...HEALER_SPELLS,
};
