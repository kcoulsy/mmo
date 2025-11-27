import { Player, PlayerStats } from "./player";
import { Position } from "../common/position";
import { World } from "../../core/types";
import { ConnectedClient } from "../../core/network";
import {
  PlayerJoinMessage,
  PlayerLeaveMessage,
  PlayerMoveMessage,
  PlayerUpdateMessage,
  PlayerInputMessage,
  ChatMessage,
} from "@shared/messages";
import { PlayerModel } from "../../db/models/PlayerModel";
import { MovementSystem } from "./movement";

export class PlayerManager {
  private players: Map<string, Player> = new Map(); // playerId -> Player
  private movementSystem: MovementSystem;

  constructor(private world: World) {
    this.movementSystem = new MovementSystem(this);
  }

  // Create a player when a client connects
  async createPlayer(
    client: ConnectedClient,
    playerData: { name: string; playerId?: string }
  ): Promise<Player> {
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

    let playerStats: PlayerStats;
    let playerPosition: Position;

    if (existingPlayer) {
      // Load existing player data
      console.log(
        `[SERVER] Loading existing player ${playerId} (${playerData.name}) from database`
      );

      playerPosition = {
        x: existingPlayer.position.x,
        y: existingPlayer.position.y,
        z: existingPlayer.position.z || 0,
      };

      playerStats = {
        hp: existingPlayer.stats.hp,
        maxHp: existingPlayer.stats.maxHp,
        mp: existingPlayer.stats.mp,
        maxMp: existingPlayer.stats.maxMp,
        attack: existingPlayer.stats.strength, // Map strength to attack for now
        defense: existingPlayer.stats.vitality, // Map vitality to defense for now
        moveSpeed: 100,
        level: existingPlayer.level || 1,
      };
    } else {
      // Create new player with default spawn position
      const spawnX = 400;
      const spawnY = 300;
      console.log(
        `[SERVER] Creating new player ${playerId} (${playerData.name}) at spawn position (${spawnX}, ${spawnY})`
      );

      playerPosition = {
        x: spawnX,
        y: spawnY,
        z: 0,
      };

      playerStats = {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        moveSpeed: 100,
        level: 1,
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

    const player = new Player(
      playerId,
      playerData.name,
      playerPosition,
      playerStats,
      client.id
    );
    this.players.set(playerId, player);

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
          level: playerStats.level,
        },
      },
    };

    this.world.broadcast(joinMessage);
    console.log(`Player ${playerId} (${playerData.name}) joined the game`);

    return player;
  }

  // Remove a player when they disconnect
  async removePlayer(playerId: string): Promise<void> {
    const player = this.players.get(playerId);
    if (player) {
      // Save player position before removing them
      try {
        await PlayerModel.update(playerId, {
          position: {
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
          },
          stats: {
            hp: player.stats.hp,
            maxHp: player.stats.maxHp,
            mp: player.stats.mp,
            maxMp: player.stats.maxMp,
            strength: player.stats.attack, // Reverse mapping
            dexterity: 10, // Default for now
            intelligence: 10, // Default for now
            vitality: player.stats.defense, // Reverse mapping
          },
        });
        console.log(
          `[SERVER] Saved position for player ${playerId}: (${player.position.x}, ${player.position.y}, ${player.position.z})`
        );
      } catch (error) {
        console.error(`Error saving player position for ${playerId}:`, error);
      }

      this.players.delete(playerId);

      // Broadcast player leave message to all clients
      const leaveMessage: PlayerLeaveMessage = {
        type: "PLAYER_LEAVE",
        timestamp: Date.now(),
        playerId,
      };
      this.world.broadcast(leaveMessage);

      console.log(`Player ${playerId} left the game`);
    }
  }

  // Handle player movement
  handlePlayerMove(client: ConnectedClient, message: PlayerMoveMessage): void {
    if (!client.playerId) return;

    const player = this.players.get(client.playerId);
    if (!player) return;

    // Update position
    player.setPosition(
      message.position.x,
      message.position.y,
      message.position.z
    );

    // Update velocity if provided
    if (message.velocity) {
      player.setVelocity(message.velocity.vx, message.velocity.vy);
    }

    // Broadcast the movement to other clients
    this.world.broadcast(message, client.id);
  }

  // Handle player input (client-side prediction)
  handlePlayerInput(
    client: ConnectedClient,
    message: PlayerInputMessage
  ): void {
    if (!client.playerId) return;

    const player = this.players.get(client.playerId);
    if (!player) return;

    this.movementSystem.handlePlayerInput(player, message.input);
  }

  // Update player positions (called by game loop)
  updatePlayerPositions(deltaTime: number): void {
    const players = Array.from(this.players.values());
    this.movementSystem.updatePlayerPositions(players, deltaTime);
  }

  // Broadcast movement updates periodically
  broadcastMovementUpdates(): void {
    const currentTime = Date.now();

    for (const player of this.players.values()) {
      const moveMessage: PlayerMoveMessage = {
        type: "PLAYER_MOVE",
        timestamp: currentTime,
        playerId: player.id,
        position: {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        },
        velocity: { vx: player.velocity.vx, vy: player.velocity.vy },
      };

      // Broadcast to all clients except the player who moved
      this.world.broadcast(moveMessage, player.connectionId);
    }
  }

  // Update player stats or other properties
  updatePlayer(
    playerId: string,
    updates: Partial<{
      position: { x: number; y: number; z?: number };
      velocity: { vx: number; vy: number };
      stats: Partial<PlayerStats>;
    }>
  ): void {
    const player = this.players.get(playerId);
    if (!player) return;

    // Update position
    if (updates.position) {
      player.setPosition(
        updates.position.x,
        updates.position.y,
        updates.position.z
      );
    }

    // Update velocity
    if (updates.velocity) {
      player.setVelocity(updates.velocity.vx, updates.velocity.vy);
    }

    // Update stats
    if (updates.stats) {
      player.updateStats(updates.stats);
    }

    // Broadcast the update
    const updateMessage: PlayerUpdateMessage = {
      type: "PLAYER_UPDATE",
      timestamp: Date.now(),
      playerId,
      updates,
    };

    this.world.broadcast(updateMessage);
  }

  // Send position correction to a specific player
  sendPositionCorrectionToPlayer(
    playerId: string,
    position: { x: number; y: number; z: number }
  ): void {
    const player = this.players.get(playerId);
    if (!player) return;

    const correctionMessage: PlayerMoveMessage = {
      type: "PLAYER_MOVE",
      timestamp: Date.now(),
      playerId: playerId,
      position: { x: position.x, y: position.y, z: position.z },
      velocity: { vx: player.velocity.vx, vy: player.velocity.vy },
    };

    this.world.sendToPlayer(playerId, correctionMessage);
  }

  // Handle chat messages with distance-based broadcasting
  handleChatMessage(client: ConnectedClient, message: ChatMessage): void {
    console.log(
      `[CHAT] Received from ${client.playerId}: "${message.message}" (mode: ${message.mode})`
    );

    if (!client.playerId || !message.message.trim()) {
      console.log(
        `[CHAT] Invalid message - playerId: ${client.playerId}, message: "${message.message}"`
      );
      return;
    }

    const player = this.players.get(client.playerId);
    if (!player) {
      console.log(`[CHAT] Player not found for playerId: ${client.playerId}`);
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
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
    };

    // Broadcast based on chat mode
    switch (message.mode) {
      case "say":
        this.broadcastSayMessage(chatMessage);
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
  private broadcastSayMessage(chatMessage: ChatMessage): void {
    if (!chatMessage.position) return;

    const sayRange = 200; // pixels - adjust as needed
    const { x: senderX, y: senderY } = chatMessage.position;

    // Send to all players except the sender
    for (const player of this.players.values()) {
      if (player.id === chatMessage.playerId) continue; // Don't send to sender

      // Check distance
      if (
        MovementSystem.isWithinDistance(
          player.position,
          { x: senderX, y: senderY },
          sayRange
        )
      ) {
        this.world.sendToPlayer(player.id, chatMessage);
      }
    }

    // Also send to sender so they see their own message
    this.world.sendToPlayer(chatMessage.playerId, chatMessage);

    console.log(
      `Player ${chatMessage.playerId} said: "${chatMessage.message}" (range: ${sayRange}px)`
    );
  }

  // Broadcast messages to all players
  private broadcastGlobalMessage(chatMessage: ChatMessage): void {
    this.world.broadcast(chatMessage);
    console.log(
      `Player ${chatMessage.playerId} ${chatMessage.mode}: "${chatMessage.message}"`
    );
  }

  // Get player by ID
  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  // Get all players
  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  // Get all players for world state
  getAllPlayersForState(): Array<{
    id: string;
    name: string;
    position: { x: number; y: number; z?: number };
    velocity?: { vx: number; vy: number };
    stats: { hp: number; maxHp: number; level: number };
  }> {
    return Array.from(this.players.values()).map((player) => ({
      id: player.id,
      name: player.name,
      position: {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      },
      velocity: { vx: player.velocity.vx, vy: player.velocity.vy },
      stats: {
        hp: player.stats.hp,
        maxHp: player.stats.maxHp,
        level: player.stats.level,
      },
    }));
  }

  // Get player data for external use
  getPlayerData(playerId: string): { id: string; name: string } | null {
    const player = this.players.get(playerId);
    return player ? { id: player.id, name: player.name } : null;
  }

  // Get player position
  getPlayerPosition(
    playerId: string
  ): { x: number; y: number; z?: number } | null {
    const player = this.players.get(playerId);
    return player
      ? { x: player.position.x, y: player.position.y, z: player.position.z }
      : null;
  }

  // Get player skill level
  getPlayerSkill(
    playerId: string,
    _skillName: string
  ): { level: number; xp: number } | null {
    const player = this.players.get(playerId);
    if (!player) return null;

    // For now, skills are not implemented in the Player class
    // This would need to be added if we want skill tracking
    return null;
  }

  // Add XP to a player's skill
  addSkillXp(playerId: string, _skillName: string, xpAmount: number): void {
    // For now, skills are not implemented in the Player class
    // This would log the XP gain but not actually track skills
    console.log(
      `${playerId} gained ${xpAmount} XP in ${_skillName} (skill tracking not yet implemented)`
    );
  }

  // Broadcast to nearby players
  broadcastToNearby(
    senderPlayerId: string,
    message: any,
    range: number = 200
  ): void {
    const sender = this.players.get(senderPlayerId);
    if (!sender) return;

    for (const player of this.players.values()) {
      if (player.id === senderPlayerId) continue; // Don't send to sender

      if (
        MovementSystem.isWithinDistance(player.position, sender.position, range)
      ) {
        this.world.sendToPlayer(player.id, message);
      }
    }
  }

  // Broadcast message to players near a specific position
  broadcastToNearbyPosition(
    position: { x: number; y: number },
    message: any,
    range: number = 200
  ): void {
    for (const player of this.players.values()) {
      // Check distance from player to position
      if (MovementSystem.isWithinDistance(player.position, position, range)) {
        this.world.sendToPlayer(player.id, message);
      }
    }
  }

  // Get target information for an entity (player or game object)
  getTargetInfo(targetId: string): {
    name: string;
    type: "player" | "npc" | "monster";
    level?: number;
    hp?: number;
    maxHp?: number;
    position: { x: number; y: number; z?: number };
  } | null {
    console.log(`[SERVER] getTargetInfo called for: ${targetId}`);

    // First check if it's a player
    const player = this.players.get(targetId);
    if (player) {
      console.log(
        `[SERVER] Found player ${targetId}: name="${player.name}", type="player"`
      );
      return {
        name: player.name,
        type: "player",
        level: player.stats.level,
        hp: player.stats.hp,
        maxHp: player.stats.maxHp,
        position: {
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
        },
      };
    }

    // Check if it's an NPC or monster (targetable entities)
    const gameObject = this.world.gameObjectManager.getObject(targetId);
    if (gameObject) {
      const template = this.world.gameObjectManager.getTemplate(
        gameObject.templateId
      );
      if (template && template.objectType === "npc") {
        console.log(
          `[SERVER] Found ${template.objectType} ${targetId}: name="${template.name}"`
        );
        return {
          name: template.name,
          type: "npc",
          level: 1, // NPCs would have levels in a full implementation
          hp: 100, // Default health for NPCs
          maxHp: 100,
          position: {
            x: gameObject.position.x,
            y: gameObject.position.y,
            z: gameObject.position.z,
          },
        };
      }
    }

    console.log(`[SERVER] No target found for ${targetId}`);
    return null;
  }
}
