// Server-side player management system
import { EntityId } from "../../../shared/ecs";
import {
  Player,
  Position,
  Velocity,
  Renderable,
  Stats,
} from "@shared/ecs/components";
import { ItemSystem } from "../systems/ItemSystem";
import {
  PlayerJoinMessage,
  PlayerLeaveMessage,
  PlayerMoveMessage,
  PlayerUpdateMessage,
  PlayerInputMessage,
  ChatMessage,
} from "@shared/messages";
import { WebSocketServer, ConnectedClient } from "./websocketServer";
import { PlayerModel } from "../db/models/PlayerModel";

export class PlayerManager {
  private playerEntities: Map<string, EntityId> = new Map(); // playerId -> entityId
  private entityPlayers: Map<EntityId, string> = new Map(); // entityId -> playerId

  constructor(
    private server: WebSocketServer,
    private world: any, // ServerWorld - using any to avoid circular imports
    private itemSystem: ItemSystem
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

    // Handle chat messages
    this.server.onMessage("CHAT_MESSAGE", (client, message: ChatMessage) => {
      this.handleChatMessage(client, message);
    });
  }

  // Create a player entity when a client connects
  async createPlayer(
    client: ConnectedClient,
    playerData: { name: string; playerId?: string }
  ): Promise<EntityId> {
    // Use player name as account ID for now (in a real game, you'd have proper account management)
    const accountId = playerData.name;

    // Try to find existing player data
    let existingPlayer = null;
    try {
      const players = await PlayerModel.findByAccountId(accountId);
      existingPlayer = players.length > 0 ? players[0] : null;
    } catch (error) {
      console.error("Error loading player data:", error);
    }

    // Generate player ID or use existing one
    const playerId =
      existingPlayer?.id ||
      `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    client.playerId = playerId;
    this.server.setPlayerForClient(client.id, playerId);

    // Create ECS entity
    const entityId = this.world.createEntity();

    let playerStats: Stats;
    let playerPosition: Position;

    if (existingPlayer) {
      // Load existing player data
      console.log(
        `[SERVER] Loading existing player ${playerId} (${playerData.name}) from database`
      );

      playerPosition = {
        type: "position",
        x: existingPlayer.position.x,
        y: existingPlayer.position.y,
        z: existingPlayer.position.z || 0,
      };

      playerStats = {
        type: "stats",
        hp: existingPlayer.stats.hp,
        maxHp: existingPlayer.stats.maxHp,
        mp: existingPlayer.stats.mp,
        maxMp: existingPlayer.stats.maxMp,
        attack: existingPlayer.stats.strength, // Map strength to attack for now
        defense: existingPlayer.stats.vitality, // Map vitality to defense for now
        moveSpeed: 100,
      };
    } else {
      // Create new player with default spawn position
      const spawnX = 400;
      const spawnY = 300;
      console.log(
        `[SERVER] Creating new player ${playerId} (${playerData.name}) at spawn position (${spawnX}, ${spawnY})`
      );

      playerPosition = {
        type: "position",
        x: spawnX,
        y: spawnY,
        z: 0,
      };

      playerStats = {
        type: "stats",
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        moveSpeed: 100,
      };

      // Save new player to database
      try {
        await PlayerModel.create({
          accountId,
          charName: playerData.name,
          level: 1,
          experience: 0,
          position: { x: spawnX, y: spawnY, z: 0 },
          stats: {
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            strength: 10,
            dexterity: 10,
            intelligence: 10,
            vitality: 10,
          },
          gold: 0,
        });
        console.log(`[SERVER] Saved new player ${playerId} to database`);
      } catch (error) {
        console.error("Error saving new player to database:", error);
      }
    }

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

    this.world.addComponent(entityId, playerPosition);
    this.world.addComponent(entityId, player);
    this.world.addComponent(entityId, velocity);
    this.world.addComponent(entityId, renderable);
    this.world.addComponent(entityId, playerStats);

    // Initialize inventory for new players only
    if (!existingPlayer) {
      this.itemSystem.initializePlayerInventory(entityId, playerId);

      // Give starting items
      this.itemSystem.addItemsToInventory(playerId, [
        { itemId: "health_potion", quantity: 5 },
        { itemId: "mana_potion", quantity: 3 },
        { itemId: "wooden_sword", quantity: 1 },
        { itemId: "leather_armor", quantity: 1 },
        { itemId: "copper_ore", quantity: 10 },
      ]);
    } else {
      // For existing players, load their inventory (this would need to be implemented)
      this.itemSystem.initializePlayerInventory(entityId, playerId);
      // TODO: Load saved inventory from database
    }

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
        position: playerPosition,
        stats: {
          hp: playerStats.hp,
          maxHp: playerStats.maxHp,
          level: existingPlayer?.level || 1,
        },
      },
    };

    this.server.broadcast(joinMessage);

    console.log(`Player ${playerId} (${playerData.name}) joined the game`);
    return entityId;
  }

  // Remove a player when they disconnect
  async removePlayer(playerId: string) {
    const entityId = this.playerEntities.get(playerId);
    if (entityId) {
      // Save player position before removing them
      try {
        const position = this.world.getComponent(entityId, "position");
        const stats = this.world.getComponent(entityId, "stats");

        if (position) {
          await PlayerModel.update(playerId, {
            position: {
              x: position.x,
              y: position.y,
              z: position.z,
            },
            stats: stats
              ? {
                  hp: stats.hp,
                  maxHp: stats.maxHp,
                  mp: stats.mp,
                  maxMp: stats.maxMp,
                  strength: stats.attack, // Reverse mapping
                  dexterity: 10, // Default for now
                  intelligence: 10, // Default for now
                  vitality: stats.defense, // Reverse mapping
                }
              : undefined,
          });
          console.log(
            `[SERVER] Saved position for player ${playerId}: (${position.x}, ${position.y}, ${position.z})`
          );
        }
      } catch (error) {
        console.error(`Error saving player position for ${playerId}:`, error);
      }

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
    name: string;
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
      const player = this.world.getComponent(entityId, "player");

      if (position && stats && player) {
        players.push({
          id: playerId,
          name: player.name,
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

  // Handle chat messages with distance-based broadcasting for 'say' mode
  private handleChatMessage(client: ConnectedClient, message: ChatMessage) {
    console.log(
      `[CHAT] Received from ${client.playerId}: "${message.message}" (mode: ${message.mode})`
    );

    if (!client.playerId || !message.message.trim()) {
      console.log(
        `[CHAT] Invalid message - playerId: ${client.playerId}, message: "${message.message}"`
      );
      return;
    }

    const entityId = this.playerEntities.get(client.playerId);
    if (!entityId) {
      console.log(
        `[CHAT] Player entity not found for playerId: ${client.playerId}`
      );
      return;
    }

    // Get sender's position for distance-based filtering
    const senderPosition = this.world.getComponent(entityId, "position");
    const player = this.world.getComponent(entityId, "player");

    if (!senderPosition || !player) {
      console.log(
        `[CHAT] Missing position or player component for playerId: ${client.playerId}`
      );
      return;
    }

    // Create the chat message with sender info
    const chatMessage: ChatMessage = {
      type: "CHAT_MESSAGE",
      timestamp: Date.now(),
      playerId: client.playerId,
      playerName: player.name,
      message: message.message.trim(),
      mode: message.mode,
      position: {
        x: senderPosition.x,
        y: senderPosition.y,
        z: senderPosition.z,
      },
    };

    // Broadcast based on chat mode
    switch (message.mode) {
      case "say":
        this.broadcastSayMessage(chatMessage, client);
        break;
      case "guild":
        // TODO: Implement guild-based broadcasting
        this.broadcastGlobalMessage(chatMessage);
        break;
      case "party":
        // TODO: Implement party-based broadcasting
        this.broadcastGlobalMessage(chatMessage);
        break;
      case "global":
      default:
        this.broadcastGlobalMessage(chatMessage);
        break;
    }
  }

  // Broadcast 'say' messages only to nearby players
  private broadcastSayMessage(
    chatMessage: ChatMessage,
    senderClient: ConnectedClient
  ) {
    if (!chatMessage.position) return;

    const sayRange = 200; // pixels - adjust as needed
    const { x: senderX, y: senderY } = chatMessage.position;

    // Send to all clients except the sender
    for (const client of this.server.getClients()) {
      if (client.id === senderClient.id) continue; // Don't send to sender

      if (client.playerId) {
        const entityId = this.playerEntities.get(client.playerId);
        if (entityId) {
          const position = this.world.getComponent(entityId, "position");
          if (position) {
            // Calculate distance
            const dx = position.x - senderX;
            const dy = position.y - senderY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Only send if within range
            if (distance <= sayRange) {
              this.server.sendToClient(client, chatMessage);
            }
          }
        }
      }
    }

    // Also send to sender so they see their own message
    this.server.sendToClient(senderClient, chatMessage);

    console.log(
      `Player ${chatMessage.playerId} said: "${chatMessage.message}" (range: ${sayRange}px)`
    );
  }

  // Broadcast messages to all players
  private broadcastGlobalMessage(chatMessage: ChatMessage) {
    this.server.broadcast(chatMessage);
    console.log(
      `Player ${chatMessage.playerId} ${chatMessage.mode}: "${chatMessage.message}"`
    );
  }

  // Get target information for an entity
  getTargetInfo(targetId: string): {
    name: string;
    type: "player" | "npc" | "monster";
    level?: number;
    hp?: number;
    maxHp?: number;
    position: { x: number; y: number; z?: number };
  } | null {
    console.log(`[SERVER] getTargetInfo called for: ${targetId}`);
    console.log(
      `[SERVER] Current playerEntities:`,
      Array.from(this.playerEntities.entries())
    );

    // First check if it's a player ID (direct lookup)
    if (this.playerEntities.has(targetId)) {
      const entityId = this.playerEntities.get(targetId)!;
      console.log(`[SERVER] Found player ${targetId} with entity ${entityId}`);

      const player = this.world.getComponent(entityId, "player") as Player;
      const position = this.world.getComponent(
        entityId,
        "position"
      ) as Position;
      const stats = this.world.getComponent(entityId, "stats") as Stats;

      if (player && position && stats) {
        console.log(
          `[SERVER] getTargetInfo for player ${targetId}: name="${player.name}", type="player"`
        );
        return {
          name: player.name,
          type: "player",
          level: 1, // TODO: Get actual level from stats
          hp: stats.hp,
          maxHp: stats.maxHp,
          position: { x: position.x, y: position.y, z: position.z },
        };
      }
    }

    // If not a player ID, check if it's an entity ID
    for (const [playerId, entityId] of this.playerEntities) {
      console.log(
        `[SERVER] Checking if ${targetId} matches entity ${entityId} for player ${playerId}`
      );
      if (entityId === targetId) {
        const player = this.world.getComponent(entityId, "player") as Player;
        const position = this.world.getComponent(
          entityId,
          "position"
        ) as Position;
        const stats = this.world.getComponent(entityId, "stats") as Stats;

        console.log(
          `[SERVER] Found matching entity! Player:`,
          player,
          `Position:`,
          position,
          `Stats:`,
          stats
        );

        if (player && position && stats) {
          console.log(
            `[SERVER] getTargetInfo for player ${playerId}: name="${player.name}", type="player"`
          );
          return {
            name: player.name,
            type: "player",
            level: 1, // TODO: Get actual level from stats
            hp: stats.hp,
            maxHp: stats.maxHp,
            position: { x: position.x, y: position.y, z: position.z },
          };
        }
      }
    }

    // Check if it's an NPC (like the test NPC created in index.ts)
    const position = this.world.getComponent(targetId, "position") as Position;
    const npc = this.world.getComponent(targetId, "npc"); // Assuming NPCs have an 'npc' component

    if (position && npc) {
      return {
        name: npc.name || "NPC",
        type: "npc",
        level: 1,
        hp: 100, // Default NPC health
        maxHp: 100,
        position: { x: position.x, y: position.y, z: position.z },
      };
    }

    // Entity not found
    return null;
  }
}
