import { GameObjectManager } from "src/game/object/gameobject-manager";
import { ConnectedClient } from "./network";
import { World, Session } from "./types";
import { PlayerManager } from "src/game/player/player-manager";
import { ItemManager } from "src/game/items/item-manager";

class WorldImpl implements World {
  // Managers
  gameObjectManager!: GameObjectManager;
  playerManager!: PlayerManager;
  itemManager!: ItemManager;

  // Sessions
  sessions: Map<string, Session> = new Map();

  constructor() {
    this.initializeManagers();
  }

  private initializeManagers() {
    // Initialize managers
    this.gameObjectManager = new GameObjectManager(this);
    this.playerManager = new PlayerManager(this);
    this.itemManager = new ItemManager(this);
  }

  createSession(client: ConnectedClient): Session {
    const session: Session = {
      id: client.id,
      client,
      send: (message: any) => {
        // This will be set when WebSocketServer is initialized
      },
    };

    this.sessions.set(session.id, session);
    return session;
  }

  removeSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  getSessionByPlayerId(playerId: string): Session | undefined {
    for (const session of this.sessions.values()) {
      if (session.playerId === playerId) {
        return session;
      }
    }
    return undefined;
  }

  sendToPlayer(playerId: string, message: any): void {
    const session = this.getSessionByPlayerId(playerId);
    if (session) {
      session.send(message);
    }
  }

  sendToSession(sessionId: string, message: any): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.send(message);
    }
  }

  broadcast(message: any, excludeSessionId?: string): void {
    for (const session of this.sessions.values()) {
      if (excludeSessionId && session.id === excludeSessionId) continue;
      session.send(message);
    }
  }

  // World update loop
  update(deltaTime: number): void {
    this.gameObjectManager.update(deltaTime);
    this.playerManager.updatePlayerPositions(deltaTime);
    // Add other update logic as needed
  }

  // Initialize world objects
  initializeWorldObjects(worldSize: { width: number; height: number }): void {
    this.gameObjectManager.spawnWorldObjects(worldSize);
  }
}

// Singleton instance
let worldInstance: WorldImpl | null = null;

export function getWorld(): World {
  if (!worldInstance) {
    worldInstance = new WorldImpl();
  }
  return worldInstance;
}

export function createWorld(): World {
  worldInstance = new WorldImpl();
  return worldInstance;
}
