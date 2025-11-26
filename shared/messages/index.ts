// Shared network message types for client-server communication

export type MessageType =
  | "PLAYER_JOIN_REQUEST"
  | "PLAYER_JOIN"
  | "PLAYER_LEAVE"
  | "PLAYER_MOVE"
  | "PLAYER_INPUT"
  | "PLAYER_UPDATE"
  | "WORLD_STATE"
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
  playerName: string;
  playerId: string;
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

// Union type for all messages
export type Message =
  | PlayerJoinRequestMessage
  | PlayerJoinMessage
  | PlayerLeaveMessage
  | PlayerMoveMessage
  | PlayerInputMessage
  | PlayerUpdateMessage
  | WorldStateMessage
  | PingMessage
  | PongMessage;

// Message handler type for processing incoming messages
export type MessageHandler<T extends Message> = (message: T) => void;

// Connection state
export interface ConnectionState {
  connected: boolean;
  playerId?: string;
  latency?: number;
  lastPingTime?: number;
}
