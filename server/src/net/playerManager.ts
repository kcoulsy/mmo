// Server-side player management system
import { EntityId } from "../../../shared/ecs";
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
  PlayerInputMessage,
} from "@shared/messages";
import { WebSocketServer, ConnectedClient } from "./websocketServer";

export class PlayerManager {
  private playerEntities: Map<string, EntityId> = new Map(); // playerId -> entityId
  private entityPlayers: Map<EntityId, string> = new Map(); // entityId -> playerId

  constructor(
    private server: WebSocketServer,
    private world: any // ServerWorld - using any to avoid circular imports
  ) {
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    // Handle player movement messages
    this.server.onMessage(
      "PLAYER_MOVE",
      (client, message: PlayerMoveMessage) => {
        this.handlePlayerMove(client, message);
      }
    );

    // Handle player input messages
    this.server.onMessage(
      "PLAYER_INPUT",
      (client, message: PlayerInputMessage) => {
        this.handlePlayerInput(client, message);
      }
    );
  }

  // Create a player entity when a client connects
  createPlayer(
    client: ConnectedClient,
    playerData: { name: string; playerId?: string }
  ): EntityId {
    // Use provided playerId or generate one (in a real game, this might come from database)
    const playerId =
      playerData.playerId ||
      `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    client.playerId = playerId;
    this.server.setPlayerForClient(client.id, playerId);

    // Create ECS entity
    const entityId = this.world.createEntity();

    // Add components
    const position: Position = {
      type: "position",
      x: Math.random() * 800, // Random spawn position
      y: Math.random() * 600,
      z: 0,
    };

    const player: Player = {
      type: "player",
      id: playerId,
      name: playerData.name,
      connectionId: client.id,
    };

    const velocity: Velocity = {
      type: "velocity",
      vx: 0,
      vy: 0,
    };

    const renderable: Renderable = {
      type: "renderable",
      spriteId: "player",
      layer: 1,
      frame: 0,
    };

    const stats: Stats = {
      type: "stats",
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 10,
      defense: 5,
      moveSpeed: 100,
    };

    this.world.addComponent(entityId, position);
    this.world.addComponent(entityId, player);
    this.world.addComponent(entityId, velocity);
    this.world.addComponent(entityId, renderable);
    this.world.addComponent(entityId, stats);

    // Track the mapping
    this.playerEntities.set(playerId, entityId);
    this.entityPlayers.set(entityId, playerId);

    // Send join message to all clients
    const joinMessage: PlayerJoinMessage = {
      type: "PLAYER_JOIN",
      timestamp: Date.now(),
      playerId,
      playerData: {
        name: playerData.name,
        position,
        stats: {
          hp: stats.hp,
          maxHp: stats.maxHp,
          level: 1, // TODO: Get from player data
        },
      },
    };

    this.server.broadcast(joinMessage);

    console.log(`Player ${playerId} (${playerData.name}) joined the game`);
    return entityId;
  }

  // Remove a player when they disconnect
  removePlayer(playerId: string) {
    const entityId = this.playerEntities.get(playerId);
    if (entityId) {
      this.world.destroyEntity(entityId);
      this.playerEntities.delete(playerId);
      this.entityPlayers.delete(entityId);

      // Broadcast player leave message to all clients
      const leaveMessage: PlayerLeaveMessage = {
        type: "PLAYER_LEAVE",
        timestamp: Date.now(),
        playerId,
      };
      this.server.broadcast(leaveMessage);

      console.log(`Player ${playerId} left the game`);
    }
  }

  // Handle player movement
  private handlePlayerMove(
    client: ConnectedClient,
    message: PlayerMoveMessage
  ) {
    if (!client.playerId) return;

    const entityId = this.playerEntities.get(client.playerId);
    if (!entityId) return;

    // Update position component
    const position = this.world.getComponent(entityId, "position");
    if (position) {
      position.x = message.position.x;
      position.y = message.position.y;
      position.z = message.position.z || 0;
    }

    // Update velocity component if provided
    if (message.velocity) {
      const velocity = this.world.getComponent(entityId, "velocity");
      if (velocity) {
        velocity.vx = message.velocity.vx;
        velocity.vy = message.velocity.vy;
      }
    }

    // Broadcast the movement to other clients
    this.server.broadcastExcept(client, message);
  }

  // Handle player input (client-side prediction)
  private handlePlayerInput(
    client: ConnectedClient,
    message: PlayerInputMessage
  ) {
    if (!client.playerId) return;

    const entityId = this.playerEntities.get(client.playerId);
    if (!entityId) return;

    const velocity = this.world.getComponent(entityId, "velocity");
    const stats = this.world.getComponent(entityId, "stats");

    if (!velocity || !stats) return;

    const speed = stats.moveSpeed || 100;

    // Calculate velocity based on input
    let vx = 0;
    let vy = 0;

    if (message.input.up) vy -= 1;
    if (message.input.down) vy += 1;
    if (message.input.left) vx -= 1;
    if (message.input.right) vx += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const length = Math.sqrt(vx * vx + vy * vy);
      vx /= length;
      vy /= length;
    }

    velocity.vx = vx * speed;
    velocity.vy = vy * speed;

    // TODO: Add movement validation (collision, boundaries, etc.)
    // For now, we accept all movement - no position correction needed

    // Only send corrections when validation fails, not for every input
    // The client should predict movement freely until validation fails
  }

  // Get player entity by player ID
  getPlayerEntity(playerId: string): EntityId | undefined {
    return this.playerEntities.get(playerId);
  }

  // Get player ID by entity ID
  getEntityPlayer(entityId: EntityId): string | undefined {
    return this.entityPlayers.get(entityId);
  }

  // Get all player entities
  getAllPlayerEntities(): EntityId[] {
    return Array.from(this.playerEntities.values());
  }

  // Get all players for world state
  getAllPlayers(): Array<{
    id: string;
    position: { x: number; y: number; z?: number };
    velocity?: { vx: number; vy: number };
    stats: { hp: number; maxHp: number; level: number };
    spriteId?: string;
    frame?: number;
  }> {
    const players = [];

    for (const [playerId, entityId] of this.playerEntities) {
      const position = this.world.getComponent(entityId, "position");
      const velocity = this.world.getComponent(entityId, "velocity");
      const renderable = this.world.getComponent(entityId, "renderable");
      const stats = this.world.getComponent(entityId, "stats");

      if (position && stats) {
        players.push({
          id: playerId,
          position: { x: position.x, y: position.y, z: position.z },
          velocity: velocity ? { vx: velocity.vx, vy: velocity.vy } : undefined,
          stats: {
            hp: stats.hp,
            maxHp: stats.maxHp,
            level: 1, // TODO: Get from player data
          },
          spriteId: renderable?.spriteId,
          frame: renderable?.frame,
        });
      }
    }

    return players;
  }

  // Update player stats or other properties
  updatePlayer(
    playerId: string,
    updates: Partial<{
      position: { x: number; y: number; z?: number };
      velocity: { vx: number; vy: number };
      stats: Partial<Stats>;
      spriteId: string;
      frame: number;
    }>
  ) {
    const entityId = this.playerEntities.get(playerId);
    if (!entityId) return;

    // Update position
    if (updates.position) {
      const position = this.world.getComponent(entityId, "position");
      if (position) {
        position.x = updates.position.x;
        position.y = updates.position.y;
        position.z = updates.position.z || 0;
      }
    }

    // Update velocity
    if (updates.velocity) {
      const velocity = this.world.getComponent(entityId, "velocity");
      if (velocity) {
        velocity.vx = updates.velocity.vx;
        velocity.vy = updates.velocity.vy;
      }
    }

    // Update stats
    if (updates.stats) {
      const stats = this.world.getComponent(entityId, "stats");
      if (stats) {
        Object.assign(stats, updates.stats);
      }
    }

    // Update renderable
    if (updates.spriteId !== undefined || updates.frame !== undefined) {
      const renderable = this.world.getComponent(entityId, "renderable");
      if (renderable) {
        if (updates.spriteId !== undefined)
          renderable.spriteId = updates.spriteId;
        if (updates.frame !== undefined) renderable.frame = updates.frame;
      }
    }

    // Broadcast the update
    const updateMessage: PlayerUpdateMessage = {
      type: "PLAYER_UPDATE",
      timestamp: Date.now(),
      playerId,
      updates,
    };

    this.server.broadcast(updateMessage);
  }

  // Send position correction to a specific player by player ID
  sendPositionCorrectionToPlayer(
    playerId: string,
    position: { x: number; y: number; z: number }
  ) {
    const client = this.server.getClientByPlayerId(playerId);
    if (!client) return;

    const entityId = this.playerEntities.get(playerId);
    if (!entityId) return;

    const velocity = this.world.getComponent(entityId, "velocity");

    const correctionMessage: PlayerMoveMessage = {
      type: "PLAYER_MOVE",
      timestamp: Date.now(),
      playerId: playerId,
      position: { x: position.x, y: position.y, z: position.z },
      velocity: velocity ? { vx: velocity.vx, vy: velocity.vy } : undefined,
    };

    this.server.sendToClient(client, correctionMessage);
  }
}
