// Client-side network system for handling multiplayer synchronization
import { System } from "@shared/ecs";
import { EntityId } from "@shared/ecs";
import {
  Player,
  Position,
  Velocity,
  Renderable,
  Stats,
} from "@shared/ecs/components";
import {
  PlayerJoinMessage,
  PlayerLeaveMessage,
  PlayerMoveMessage,
  PlayerUpdateMessage,
  WorldStateMessage,
} from "@shared/messages";
import { GameClient } from "./client";

export class NetworkSystem implements System {
  private remotePlayers: Map<string, EntityId> = new Map(); // playerId -> entityId
  private localPlayerId?: string;

  constructor(
    private client: GameClient,
    private world: any, // ClientWorld - using any to avoid circular imports
    private interpolationSystem?: any // InterpolationSystem - optional for smooth movement
  ) {
    this.setupMessageHandlers();
  }

  update(entities: Map<EntityId, any>, deltaTime: number): void {
    // Send local player position updates
    if (this.localPlayerId) {
      const localEntityId = this.remotePlayers.get(this.localPlayerId);
      if (localEntityId) {
        const entity = entities.get(localEntityId);
        const position = entity?.components.get("position");
        const velocity = entity?.components.get("velocity");

        if (position) {
          const moveMessage: PlayerMoveMessage = {
            type: "PLAYER_MOVE",
            timestamp: Date.now(),
            playerId: this.localPlayerId,
            position: { x: position.x, y: position.y, z: position.z },
            velocity: velocity
              ? { vx: velocity.vx, vy: velocity.vy }
              : undefined,
          };

          this.client.send(moveMessage);
        }
      }
    }
  }

  // Set the local player (the client's own player)
  setLocalPlayer(playerId: string, entityId: EntityId) {
    this.localPlayerId = playerId;
    this.remotePlayers.set(playerId, entityId);
  }

  // Get remote player entity by player ID
  getRemotePlayerEntity(playerId: string): EntityId | undefined {
    return this.remotePlayers.get(playerId);
  }

  private setupMessageHandlers() {
    // Handle new players joining
    this.client.onMessage("PLAYER_JOIN", (message: PlayerJoinMessage) => {
      this.handlePlayerJoin(message);
    });

    // Handle players leaving
    this.client.onMessage("PLAYER_LEAVE", (message: PlayerLeaveMessage) => {
      this.handlePlayerLeave(message);
    });

    // Handle player movement
    this.client.onMessage("PLAYER_MOVE", (message: PlayerMoveMessage) => {
      this.handlePlayerMove(message);
    });

    // Handle player updates
    this.client.onMessage("PLAYER_UPDATE", (message: PlayerUpdateMessage) => {
      this.handlePlayerUpdate(message);
    });

    // Handle world state (initial sync)
    this.client.onMessage("WORLD_STATE", (message: WorldStateMessage) => {
      this.handleWorldState(message);
    });
  }

  private handlePlayerJoin(message: PlayerJoinMessage) {
    const { playerId, playerData } = message;

    // Skip if this is our own player (we already have it)
    if (playerId === this.localPlayerId) return;

    // Create remote player entity
    const entityId = this.world.createEntity();

    // Add components
    const position: Position = {
      type: "position",
      x: playerData.position.x,
      y: playerData.position.y,
      z: playerData.position.z || 0,
    };

    const player: Player = {
      type: "player",
      id: playerId,
      name: playerData.name,
      isLocal: false,
    };

    const velocity: Velocity = {
      type: "velocity",
      vx: 0,
      vy: 0,
    };

    const renderable: Renderable = {
      type: "renderable",
      spriteId: "player_remote", // Different sprite for remote players
      layer: 1,
      frame: 0,
    };

    const stats: Stats = {
      type: "stats",
      hp: playerData.stats.hp,
      maxHp: playerData.stats.maxHp,
      mp: 0,
      maxMp: 0,
      attack: 10,
      defense: 5,
      moveSpeed: 100,
    };

    this.world.addComponent(entityId, position);
    this.world.addComponent(entityId, player);
    this.world.addComponent(entityId, velocity);
    this.world.addComponent(entityId, renderable);
    this.world.addComponent(entityId, stats);

    // Track the remote player
    this.remotePlayers.set(playerId, entityId);

    console.log(`Remote player ${playerId} (${playerData.name}) joined`);
  }

  private handlePlayerLeave(message: PlayerLeaveMessage) {
    const { playerId } = message;

    const entityId = this.remotePlayers.get(playerId);
    if (entityId) {
      this.world.destroyEntity(entityId);
      this.remotePlayers.delete(playerId);
      console.log(`Remote player ${playerId} left`);
    }
  }

  private handlePlayerMove(message: PlayerMoveMessage) {
    const { playerId, position, velocity } = message;

    // Skip if this is our own player (we control it locally)
    if (playerId === this.localPlayerId) return;

    const entityId = this.remotePlayers.get(playerId);
    if (!entityId) return;

    // Use interpolation for smooth movement
    if (this.interpolationSystem) {
      this.interpolationSystem.updateTargetPosition(entityId, {
        x: position.x,
        y: position.y,
        z: position.z || 0,
      });
    } else {
      // Fallback: direct position update
      const posComponent = this.world.getComponent(entityId, "position");
      if (posComponent) {
        posComponent.x = position.x;
        posComponent.y = position.y;
        posComponent.z = position.z || 0;
      }
    }

    // Update velocity component if provided
    if (velocity) {
      const velComponent = this.world.getComponent(entityId, "velocity");
      if (velComponent) {
        velComponent.vx = velocity.vx;
        velComponent.vy = velocity.vy;
      }
    }
  }

  private handlePlayerUpdate(message: PlayerUpdateMessage) {
    const { playerId, updates } = message;

    // Skip if this is our own player (we control it locally)
    if (playerId === this.localPlayerId) return;

    const entityId = this.remotePlayers.get(playerId);
    if (!entityId) return;

    // Update position
    if (updates.position) {
      const posComponent = this.world.getComponent(entityId, "position");
      if (posComponent) {
        posComponent.x = updates.position.x;
        posComponent.y = updates.position.y;
        posComponent.z = updates.position.z || 0;
      }
    }

    // Update velocity
    if (updates.velocity) {
      const velComponent = this.world.getComponent(entityId, "velocity");
      if (velComponent) {
        velComponent.vx = updates.velocity.vx;
        velComponent.vy = updates.velocity.vy;
      }
    }

    // Update stats
    if (updates.stats) {
      const statsComponent = this.world.getComponent(entityId, "stats");
      if (statsComponent) {
        Object.assign(statsComponent, updates.stats);
      }
    }

    // Update renderable
    if (updates.spriteId !== undefined || updates.frame !== undefined) {
      const renderableComponent = this.world.getComponent(
        entityId,
        "renderable"
      );
      if (renderableComponent) {
        if (updates.spriteId !== undefined)
          renderableComponent.spriteId = updates.spriteId;
        if (updates.frame !== undefined)
          renderableComponent.frame = updates.frame;
      }
    }
  }

  private handleWorldState(message: WorldStateMessage) {
    // Sync all players from server state
    // This is useful for initial connection or resync
    for (const player of message.players) {
      const entityId = this.remotePlayers.get(player.id);

      if (entityId) {
        // Update existing player
        const posComponent = this.world.getComponent(entityId, "position");
        if (posComponent) {
          posComponent.x = player.position.x;
          posComponent.y = player.position.y;
          posComponent.z = player.position.z || 0;
        }

        if (player.velocity) {
          const velComponent = this.world.getComponent(entityId, "velocity");
          if (velComponent) {
            velComponent.vx = player.velocity.vx;
            velComponent.vy = player.velocity.vy;
          }
        }

        const statsComponent = this.world.getComponent(entityId, "stats");
        if (statsComponent) {
          statsComponent.hp = player.stats.hp;
          statsComponent.maxHp = player.stats.maxHp;
        }

        if (player.spriteId !== undefined || player.frame !== undefined) {
          const renderableComponent = this.world.getComponent(
            entityId,
            "renderable"
          );
          if (renderableComponent) {
            if (player.spriteId !== undefined)
              renderableComponent.spriteId = player.spriteId;
            if (player.frame !== undefined)
              renderableComponent.frame = player.frame;
          }
        }
      } else {
        // Create new remote player entity if we don't know about this player
        // Skip our own player (we already have it)
        if (player.id !== this.localPlayerId) {
          this.createRemotePlayerFromWorldState(player);
        }
      }
    }
  }

  private createRemotePlayerFromWorldState(playerData: {
    id: string;
    position: { x: number; y: number; z?: number };
    velocity?: { vx: number; vy: number };
    stats: { hp: number; maxHp: number; level: number };
    spriteId?: string;
    frame?: number;
  }) {
    // Create remote player entity
    const entityId = this.world.createEntity();

    // Add components
    const position: Position = {
      type: "position",
      x: playerData.position.x,
      y: playerData.position.y,
      z: playerData.position.z || 0,
    };

    const player: Player = {
      type: "player",
      id: playerData.id,
      name: `Player ${playerData.id}`, // We don't have the name in world state, so use ID
      isLocal: false,
    };

    const velocity: Velocity = {
      type: "velocity",
      vx: playerData.velocity?.vx || 0,
      vy: playerData.velocity?.vy || 0,
    };

    const renderable: Renderable = {
      type: "renderable",
      spriteId: playerData.spriteId || "player_remote",
      layer: 1,
      frame: playerData.frame || 0,
    };

    const stats: Stats = {
      type: "stats",
      hp: playerData.stats.hp,
      maxHp: playerData.stats.maxHp,
      mp: 0,
      maxMp: 0,
      attack: 10,
      defense: 5,
      moveSpeed: 100,
    };

    this.world.addComponent(entityId, position);
    this.world.addComponent(entityId, player);
    this.world.addComponent(entityId, velocity);
    this.world.addComponent(entityId, renderable);
    this.world.addComponent(entityId, stats);

    // Track the remote player
    this.remotePlayers.set(playerData.id, entityId);

    console.log(`Created remote player ${playerData.id} from world state`);
  }

  // Get all remote player entities
  getRemotePlayerEntities(): EntityId[] {
    return Array.from(this.remotePlayers.values()).filter((entityId) => {
      const playerComponent = this.world.getComponent(entityId, "player");
      return playerComponent && !playerComponent.isLocal;
    });
  }

  // Clean up when disconnecting
  cleanup() {
    for (const [playerId, entityId] of this.remotePlayers) {
      if (playerId !== this.localPlayerId) {
        this.world.destroyEntity(entityId);
      }
    }
    this.remotePlayers.clear();
    this.localPlayerId = undefined;
  }
}
