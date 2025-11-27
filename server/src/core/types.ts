// Core types for the server
import { PlayerManager } from "src/game/player/player-manager";
import { ItemManager } from "src/game/items/item-manager";
import { GameObjectManager } from "src/game/object/gameobject-manager";
import { ConnectedClient } from "./network";
import { MessageType } from "@shared/messages";

export interface Session {
  id: string;
  playerId?: string;
  client: ConnectedClient;
  send(message: any): void;
}

export interface HandlerContext {
  session: Session;
  world: World;
  // Add other context as needed (e.g., database, config, etc.)
}

export interface World {
  // Managers
  gameObjectManager: GameObjectManager;
  playerManager: PlayerManager;
  itemManager: ItemManager;

  // Sessions
  sessions: Map<string, Session>;

  // Methods
  createSession(client: ConnectedClient): Session;
  removeSession(sessionId: string): void;
  getSession(sessionId: string): Session | undefined;
  getSessionByPlayerId(playerId: string): Session | undefined;
  sendToPlayer(playerId: string, message: any): void;
  sendToSession(sessionId: string, message: any): void;
  broadcast(message: any, excludeSessionId?: string): void;
  update(deltaTime: number): void;
  initializeWorldObjects(worldSize: { width: number; height: number }): void;
}

export type HandlerFunction<T = any> = (
  ctx: HandlerContext,
  message: T
) => void;

export function registerHandler<T>(
  messageType: MessageType,
  handler: HandlerFunction<T>
) {
  return { messageType, handler };
}
