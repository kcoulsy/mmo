export type MessageType = "PLAYER_JOIN_REQUEST" | "PLAYER_JOIN" | "PLAYER_LEAVE" | "PLAYER_MOVE" | "PLAYER_INPUT" | "PLAYER_UPDATE" | "WORLD_STATE" | "CHAT_MESSAGE" | "SET_TARGET" | "CLEAR_TARGET" | "TARGET_INFO" | "HARVEST_OBJECT" | "HARVEST_RESULT" | "INVENTORY_UPDATE" | "PING" | "PONG";
export interface NetworkMessage {
    type: MessageType;
    timestamp: number;
    id?: string;
}
export interface PlayerJoinRequestMessage extends NetworkMessage {
    type: "PLAYER_JOIN_REQUEST";
    playerName?: string;
    playerId?: string;
}
export interface PlayerJoinMessage extends NetworkMessage {
    type: "PLAYER_JOIN";
    playerId: string;
    playerData: {
        name: string;
        position: {
            x: number;
            y: number;
            z?: number;
        };
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
export interface PlayerMoveMessage extends NetworkMessage {
    type: "PLAYER_MOVE";
    playerId: string;
    position: {
        x: number;
        y: number;
        z?: number;
    };
    velocity?: {
        vx: number;
        vy: number;
    };
    timestamp: number;
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
    timestamp: number;
}
export interface PlayerUpdateMessage extends NetworkMessage {
    type: "PLAYER_UPDATE";
    playerId: string;
    updates: Partial<{
        position: {
            x: number;
            y: number;
            z?: number;
        };
        velocity: {
            vx: number;
            vy: number;
        };
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
        position: {
            x: number;
            y: number;
            z?: number;
        };
    };
}
export interface WorldStateMessage extends NetworkMessage {
    type: "WORLD_STATE";
    players: Array<{
        id: string;
        position: {
            x: number;
            y: number;
            z?: number;
        };
        velocity?: {
            vx: number;
            vy: number;
        };
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
        components: any[];
    }>;
}
export interface PingMessage extends NetworkMessage {
    type: "PING";
    clientTime: number;
}
export interface PongMessage extends NetworkMessage {
    type: "PONG";
    clientTime: number;
    serverTime: number;
}
export type ChatMode = "say" | "guild" | "party" | "global";
export interface ChatMessage extends NetworkMessage {
    type: "CHAT_MESSAGE";
    playerId: string;
    playerName: string;
    message: string;
    mode: ChatMode;
    position?: {
        x: number;
        y: number;
        z?: number;
    };
}
export type Message = PlayerJoinRequestMessage | PlayerJoinMessage | PlayerLeaveMessage | PlayerMoveMessage | PlayerInputMessage | PlayerUpdateMessage | WorldStateMessage | ChatMessage | SetTargetMessage | ClearTargetMessage | TargetInfoMessage | HarvestObjectMessage | HarvestResultMessage | InventoryUpdateMessage | PingMessage | PongMessage;
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
    itemsGained?: Array<{
        itemId: string;
        quantity: number;
    }>;
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
export type MessageHandler<T extends Message> = (message: T) => void;
export interface ConnectionState {
    connected: boolean;
    playerId?: string;
    latency?: number;
    lastPingTime?: number;
}
//# sourceMappingURL=index.d.ts.map