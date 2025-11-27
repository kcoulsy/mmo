// Shared network message types for client-server communication

export type MessageType =
  | "PLAYER_JOIN_REQUEST"
  | "PLAYER_JOIN"
  | "PLAYER_LEAVE"
  | "PLAYER_MOVE"
  | "PLAYER_INPUT"
  | "PLAYER_UPDATE"
  | "WORLD_STATE"
  | "CHAT_MESSAGE"
  | "SET_TARGET"
  | "CLEAR_TARGET"
  | "TARGET_INFO"
  | "HARVEST_OBJECT"
  | "HARVEST_RESULT"
  | "GAME_OBJECT_UPDATE"
  | "INVENTORY_UPDATE"
  | "SPELLBOOK_UPDATE"
  | "CAST_SPELL"
  | "SPELL_CAST_RESULT"
  | "SPELL_EFFECT"
  | "PING"
  | "PONG";

// Base message interface
export interface NetworkMessage {
  type: MessageType;
  timestamp: number;
  id?: string; // Optional message ID for tracking
}

// Player connection messages
export interface PlayerJoinRequestMessage extends NetworkMessage {
  type: "PLAYER_JOIN_REQUEST";
  playerName?: string; // Optional - server will generate if not provided
  playerId?: string; // Optional - server will assign if not provided
}
export interface PlayerJoinMessage extends NetworkMessage {
  type: "PLAYER_JOIN";
  playerId: string;
  playerData: {
    name: string;
    position: { x: number; y: number; z?: number };
    stats: {
      hp: number;
      maxHp: number;
      level: number;
    };
  };
}

export interface PlayerLeaveMessage extends NetworkMessage {
  type: "PLAYER_LEAVE";
  playerId: string;
}

// Player movement and updates
export interface PlayerMoveMessage extends NetworkMessage {
  type: "PLAYER_MOVE";
  playerId: string;
  position: { x: number; y: number; z?: number };
  velocity?: { vx: number; vy: number };
  timestamp: number; // For interpolation
}

export interface PlayerInputMessage extends NetworkMessage {
  type: "PLAYER_INPUT";
  playerId: string;
  input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  };
  timestamp: number; // Client timestamp when input was captured
}

export interface PlayerUpdateMessage extends NetworkMessage {
  type: "PLAYER_UPDATE";
  playerId: string;
  updates: Partial<{
    position: { x: number; y: number; z?: number };
    velocity: { vx: number; vy: number };
    stats: Partial<{
      hp: number;
      maxHp: number;
      mp: number;
      maxMp: number;
    }>;
    spriteId: string;
    frame: number;
  }>;
}

export interface SetTargetMessage extends NetworkMessage {
  type: "SET_TARGET";
  playerId: string;
  targetEntityId: string;
}

export interface ClearTargetMessage extends NetworkMessage {
  type: "CLEAR_TARGET";
  playerId: string;
}

export interface TargetInfoMessage extends NetworkMessage {
  type: "TARGET_INFO";
  targetEntityId: string;
  targetInfo: {
    name: string;
    type: "player" | "npc" | "monster";
    level?: number;
    hp?: number;
    maxHp?: number;
    position: { x: number; y: number; z?: number };
  };
}

// World state synchronization
export interface WorldStateMessage extends NetworkMessage {
  type: "WORLD_STATE";
  players: Array<{
    id: string;
    name: string;
    position: { x: number; y: number; z?: number };
    velocity?: { vx: number; vy: number };
    stats: {
      hp: number;
      maxHp: number;
      level: number;
    };
    spriteId?: string;
    frame?: number;
  }>;
  entities: Array<{
    id: string;
    components: any[]; // Generic components array
  }>;
}

// Connection health messages
export interface PingMessage extends NetworkMessage {
  type: "PING";
  clientTime: number;
}

export interface PongMessage extends NetworkMessage {
  type: "PONG";
  clientTime: number;
  serverTime: number;
}

// Chat messages
export type ChatMode = "say" | "guild" | "party" | "global";

export interface ChatMessage extends NetworkMessage {
  type: "CHAT_MESSAGE";
  playerId: string;
  playerName: string;
  message: string;
  mode: ChatMode;
  position?: { x: number; y: number; z?: number }; // For distance-based filtering
}

// Union type for all messages
export type Message =
  | PlayerJoinRequestMessage
  | PlayerJoinMessage
  | PlayerLeaveMessage
  | PlayerMoveMessage
  | PlayerInputMessage
  | PlayerUpdateMessage
  | WorldStateMessage
  | ChatMessage
  | SetTargetMessage
  | ClearTargetMessage
  | TargetInfoMessage
  | HarvestObjectMessage
  | HarvestResultMessage
  | GameObjectUpdateMessage
  | InventoryUpdateMessage
  | SpellbookUpdateMessage
  | CastSpellMessage
  | SpellCastResultMessage
  | SpellEffectMessage
  | PingMessage
  | PongMessage;

// Tradeskill messages
export interface HarvestObjectMessage extends NetworkMessage {
  type: "HARVEST_OBJECT";
  gameObjectId: string;
}

export interface HarvestResultMessage extends NetworkMessage {
  type: "HARVEST_RESULT";
  gameObjectId: string;
  success: boolean;
  reason?: string;
  xpGained?: number;
  itemsGained?: Array<{ itemId: string; quantity: number }>;
}

export interface GameObjectUpdateMessage extends NetworkMessage {
  type: "GAME_OBJECT_UPDATE";
  gameObjectId: string;
  action: "remove" | "deactivate" | "activate";
  reason?: string;
}

export interface InventoryUpdateMessage extends NetworkMessage {
  type: "INVENTORY_UPDATE";
  playerId: string;
  inventory: {
    slots: Array<{
      itemId: string;
      quantity: number;
      durability?: number;
    } | null>;
    maxSlots: number;
  };
}

// Spell system messages
export interface SpellbookUpdateMessage extends NetworkMessage {
  type: "SPELLBOOK_UPDATE";
  playerId: string;
  spells: Array<{
    spellId: string;
    level: number;
    cooldownUntil?: number;
  }>;
}

export interface CastSpellMessage extends NetworkMessage {
  type: "CAST_SPELL";
  spellId: string;
  targetEntityId?: string;
  targetPosition?: { x: number; y: number; z?: number };
}

export interface SpellCastResultMessage extends NetworkMessage {
  type: "SPELL_CAST_RESULT";
  spellId: string;
  success: boolean;
  reason?: string;
  cooldownRemaining?: number;
}

export interface SpellEffectMessage extends NetworkMessage {
  type: "SPELL_EFFECT";
  spellId: string;
  casterId: string;
  targetEntityId?: string;
  targetPosition?: { x: number; y: number; z?: number };
  effects: Array<{
    type: "damage" | "heal" | "buff" | "debuff" | "teleport";
    targetEntityId: string;
    amount?: number;
    buffType?: string;
    duration?: number;
  }>;
}

// Message handler type for processing incoming messages
export type MessageHandler<T extends Message> = (message: T) => void;

// Connection state
export interface ConnectionState {
  connected: boolean;
  playerId?: string;
  latency?: number;
  lastPingTime?: number;
}
