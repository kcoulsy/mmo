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
    type: 'player' | 'npc' | 'monster';
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

// Message handler type for processing incoming messages
export type MessageHandler<T extends Message> = (message: T) => void;

// Connection state
export interface ConnectionState {
  connected: boolean;
  playerId?: string;
  latency?: number;
  lastPingTime?: number;
}
