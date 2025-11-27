// Client-side network system for handling multiplayer synchronization
import { System } from "@shared/ecs";
import { EntityId } from "@shared/ecs";
import {
  Player,
  Position,
  Velocity,
  Renderable,
  Stats,
  GameObject,
} from "@shared/ecs/components";
import {
  PlayerJoinMessage,
  PlayerLeaveMessage,
  PlayerMoveMessage,
  PlayerInputMessage,
  PlayerUpdateMessage,
  WorldStateMessage,
  ChatMessage,
  SetTargetMessage,
  ClearTargetMessage,
  TargetInfoMessage,
  InventoryUpdateMessage,
  HarvestResultMessage,
} from "@shared/messages";
import { ITEM_TEMPLATES } from "@shared/items";
import { GameClient } from "./client";

export class NetworkSystem implements System {
  private remotePlayers: Map<string, EntityId> = new Map(); // playerId -> entityId
  private remoteEntities: Map<string, EntityId> = new Map(); // serverEntityId -> clientEntityId
  private clientToServerEntities: Map<EntityId, string> = new Map(); // clientEntityId -> serverEntityId
  private localPlayerId?: string;
  private tempLocalEntityId?: EntityId; // Temporary entity ID before server assigns player ID
  private onPlayerPositionUpdate?: (position: {
    x: number;
    y: number;
    z: number;
  }) => void;
  private onPlayerUpdate?: (
    player: Partial<{
      id: string;
      name: string;
      stats: any;
      position: { x: number; y: number; z: number };
      isConnected: boolean;
      isLocal: boolean;
      inventory?: any;
    }>
  ) => void;
  private onTargetUpdate?: (target: {
    entityId: string;
    info: {
      name: string;
      type: "player" | "npc" | "monster";
      level?: number;
      hp?: number;
      maxHp?: number;
      position: { x: number; y: number; z?: number };
    } | null;
  }) => void;
  private lastInputTime = 0;
  private inputSendInterval = 50; // Send input every 50ms (20Hz) when active
  private idleInputSendInterval = 1000; // Send input every 1s when idle
  private lastSentInput = { up: false, down: false, left: false, right: false };
  private pendingInputs: Array<{
    input: { up: boolean; down: boolean; left: boolean; right: boolean };
    timestamp: number;
  }> = [];
  private serverPosition?: { x: number; y: number; z: number };
  private serverVelocity?: { vx: number; vy: number };
  private lastWorldStateHash = "";
  private onChatMessage?: (message: ChatMessage) => void;
  private onRemotePlayerPositionUpdate?: (
    playerId: string,
    position: { x: number; y: number }
  ) => void;
  private onPlayerJoined?: () => void;

  constructor(
    private client: GameClient,
    private world: any, // ClientWorld - using any to avoid circular imports
    private interpolationSystem?: any // InterpolationSystem - optional for smooth movement
  ) {
    this.setupMessageHandlers();
    this.setupDisconnectHandling();
  }

  update(entities: Map<EntityId, any>, _deltaTime: number): void {
    // Debug logging
    if (Math.random() < 0.01) {
      // Log ~1% of frames
      console.log("[NETWORK] NetworkSystem update - entities:", entities.size);
    }

    const currentTime = Date.now();

    // Check if input has changed
    const inputChanged = this.hasInputChanged();

    // Use different send intervals based on activity
    const currentInterval = inputChanged
      ? this.inputSendInterval
      : this.idleInputSendInterval;

    // Send local player input updates periodically or when input changes
    if (
      this.localPlayerId &&
      (currentTime - this.lastInputTime >= currentInterval || inputChanged)
    ) {
      this.sendInputUpdate();
      this.lastInputTime = currentTime;
      // Update last sent input to current input
      this.lastSentInput = { ...this.currentInput };
    }

    // Apply server reconciliation if we have server state
    if (this.localPlayerId && this.serverPosition) {
      this.applyServerReconciliation(entities);
    }
  }

  // Send current input state to server
  private sendInputUpdate() {
    if (!this.localPlayerId) return;

    const inputMessage: PlayerInputMessage = {
      type: "PLAYER_INPUT",
      timestamp: Date.now(),
      playerId: this.localPlayerId,
      input: this.currentInput,
    };

    // Store input for reconciliation
    this.pendingInputs.push({
      input: inputMessage.input,
      timestamp: inputMessage.timestamp,
    });

    // Keep only recent inputs for reconciliation
    const maxInputs = 10;
    if (this.pendingInputs.length > maxInputs) {
      this.pendingInputs.shift();
    }

    this.client.send(inputMessage);
  }

  // Update current input state (called by input system)
  updateInputState(input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
  }) {
    // This will be called by the input system to provide current input state
    // We store it for when we send input updates
    this.currentInput = input;
  }

  // Check if current input differs from last sent input
  private hasInputChanged(): boolean {
    return (
      this.currentInput.up !== this.lastSentInput.up ||
      this.currentInput.down !== this.lastSentInput.down ||
      this.currentInput.left !== this.lastSentInput.left ||
      this.currentInput.right !== this.lastSentInput.right
    );
  }

  private currentInput = { up: false, down: false, left: false, right: false };

  // Apply server reconciliation (rubberbanding)
  private applyServerReconciliation(entities: Map<EntityId, any>) {
    if (!this.localPlayerId) return;

    const localEntityId = this.remotePlayers.get(this.localPlayerId);
    if (!localEntityId) return;

    const entity = entities.get(localEntityId);
    const position = entity?.components.get("position") as any;
    const velocity = entity?.components.get("velocity") as any;

    if (!position || !this.serverPosition) return;

    // Calculate position error
    const errorX = this.serverPosition.x - position.x;
    const errorY = this.serverPosition.y - position.y;

    // If error is significant, rubberband to server position
    const errorThreshold = 5; // pixels
    const errorMagnitude = Math.sqrt(errorX * errorX + errorY * errorY);

    if (errorMagnitude > errorThreshold) {
      // Rubberband: smoothly move towards server position
      const rubberbandSpeed = 0.1; // How fast to correct (0-1)
      position.x += errorX * rubberbandSpeed;
      position.y += errorY * rubberbandSpeed;

      // Reset velocity to match server
      if (this.serverVelocity && velocity) {
        velocity.vx = this.serverVelocity.vx;
        velocity.vy = this.serverVelocity.vy;
      }

      console.log(`Rubberbanding: error ${errorMagnitude.toFixed(1)}px`);
    }

    // Clear server position after reconciliation
    this.serverPosition = undefined;
    this.serverVelocity = undefined;
  }

  // Set the temporary local entity (before server assigns player ID)
  setTempLocalEntity(entityId: EntityId) {
    this.tempLocalEntityId = entityId;
  }

  // Set callback for player position updates
  setPlayerPositionUpdateCallback(
    callback: (position: { x: number; y: number; z: number }) => void
  ) {
    this.onPlayerPositionUpdate = callback;
  }

  // Set callback for general player updates (name, stats, etc.)
  setPlayerUpdateCallback(
    callback: (
      player: Partial<{
        id: string;
        name: string;
        stats: any;
        position: { x: number; y: number; z: number };
        isConnected: boolean;
        isLocal: boolean;
      }>
    ) => void
  ) {
    this.onPlayerUpdate = callback;
  }

  // Set callback for target updates
  setTargetUpdateCallback(
    callback: (target: {
      entityId: string;
      info: {
        name: string;
        type: "player" | "npc" | "monster";
        level?: number;
        hp?: number;
        maxHp?: number;
        position: { x: number; y: number; z?: number };
      } | null;
    }) => void
  ) {
    this.onTargetUpdate = callback;
  }

  // Set target entity
  setTarget(targetEntityId: string) {
    if (!this.localPlayerId) return;

    console.log(`[NETWORK] Sending SET_TARGET for entity: ${targetEntityId}`);

    // Send target request to server
    this.client.send({
      type: "SET_TARGET" as any,
      timestamp: Date.now(),
      playerId: this.localPlayerId,
      targetEntityId,
    });
  }

  // Clear current target
  clearTarget() {
    if (!this.localPlayerId) return;

    console.log(`[NETWORK] Sending CLEAR_TARGET`);

    // Send clear target request to server
    this.client.send({
      type: "CLEAR_TARGET" as any,
      timestamp: Date.now(),
      playerId: this.localPlayerId,
    });
  }

  // Set the server-assigned player ID and update the temp entity
  setServerPlayerId(playerId: string) {
    console.log(`[NETWORK] Setting server player ID: ${playerId}`);
    this.localPlayerId = playerId;

    // If we have a temp entity, update its player component with the server ID
    if (this.tempLocalEntityId) {
      const playerComponent = this.world.getComponent(
        this.tempLocalEntityId,
        "player"
      );
      if (playerComponent) {
        playerComponent.id = playerId;
        console.log(`[NETWORK] Updated temp entity player ID to: ${playerId}`);
      }
      this.remotePlayers.set(playerId, this.tempLocalEntityId);
      this.tempLocalEntityId = undefined;

      // Notify the client about the new player ID for future messages
      this.client.setPlayerId(playerId);
    }
  }

  // Set callback for chat messages
  setChatMessageCallback(callback: (message: ChatMessage) => void) {
    this.onChatMessage = callback;
  }

  setRemotePlayerPositionUpdateCallback(
    callback: (playerId: string, position: { x: number; y: number }) => void
  ) {
    this.onRemotePlayerPositionUpdate = callback;
  }

  setPlayerJoinedCallback(callback: () => void) {
    this.onPlayerJoined = callback;
  }

  getLocalPlayerId(): string | undefined {
    return this.localPlayerId;
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

    // Handle chat messages
    this.client.onMessage("CHAT_MESSAGE", (message: ChatMessage) => {
      this.handleChatMessage(message);
    });

    // Handle target info
    this.client.onMessage(
      "TARGET_INFO" as any,
      (message: TargetInfoMessage) => {
        this.handleTargetInfo(message);
      }
    );

    // Handle inventory updates
    this.client.onMessage(
      "INVENTORY_UPDATE" as any,
      (message: InventoryUpdateMessage) => {
        this.handleInventoryUpdate(message);
      }
    );

    // Handle harvest results
    this.client.onMessage(
      "HARVEST_RESULT" as any,
      (message: HarvestResultMessage) => {
        this.handleHarvestResult(message);
      }
    );
  }

  private handlePlayerJoin(message: PlayerJoinMessage) {
    const { playerId, playerData } = message;

    console.log(
      `[NETWORK] Received PLAYER_JOIN: ${playerId} at position (${playerData.position.x}, ${playerData.position.y}) with name: ${playerData.name}`
    );

    // If we don't have a localPlayerId yet, this is our player
    if (!this.localPlayerId) {
      console.log(
        `[NETWORK] This is our player join: ${playerId}, tempEntityId: ${this.tempLocalEntityId}`
      );

      // Update position and player data before setting the server ID
      if (this.tempLocalEntityId) {
        const position = this.world.getComponent(
          this.tempLocalEntityId,
          "position"
        );

        if (position) {
          console.log(
            `[CLIENT] Updating local player position from (${position.x.toFixed(1)}, ${position.y.toFixed(1)}) to server position (${playerData.position.x.toFixed(1)}, ${playerData.position.y.toFixed(1)})`
          );
          position.x = playerData.position.x;
          position.y = playerData.position.y;
          position.z = playerData.position.z || 0;

          console.log(
            `[CLIENT] Position updated to: (${position.x.toFixed(1)}, ${position.y.toFixed(1)})`
          );

          // Update the player store with position, name, and stats
          if (this.onPlayerPositionUpdate) {
            this.onPlayerPositionUpdate({
              x: position.x,
              y: position.y,
              z: position.z,
            });
          }

          // Update player store with name and stats from server
          if (this.onPlayerUpdate) {
            this.onPlayerUpdate({
              id: playerId,
              name: playerData.name,
              stats: {
                ...this.world.getComponent(this.tempLocalEntityId, "stats"),
                ...playerData.stats,
              },
              position: {
                x: position.x,
                y: position.y,
                z: position.z,
              },
              isConnected: true,
              isLocal: true,
            });
          }

          // Update the ECS player component with the server-assigned name
          const playerComponent = this.world.getComponent(
            this.tempLocalEntityId,
            "player"
          );
          if (playerComponent) {
            playerComponent.name = playerData.name;
          }
        } else {
          console.log(`[NETWORK] Position component not found on temp entity`);
        }
      } else {
        console.log(`[NETWORK] No tempLocalEntityId to update position`);
      }

      this.setServerPlayerId(playerId);

      // Notify that player has successfully joined with initial data
      if (this.onPlayerJoined) {
        this.onPlayerJoined();
      }

      return;
    }

    // Handle other players joining
    if (playerId !== this.localPlayerId) {
      this.createRemotePlayer(message);
    }
  }

  private createRemotePlayer(message: PlayerJoinMessage) {
    const { playerId, playerData } = message;

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

    // Handle server correction for local player
    if (playerId === this.localPlayerId) {
      this.serverPosition = {
        x: position.x,
        y: position.y,
        z: position.z || 0,
      };
      this.serverVelocity = velocity;
      return;
    }

    const entityId = this.remotePlayers.get(playerId);
    if (!entityId) return;

    // TEMP: Use direct position update for debugging
    const posComponent = this.world.getComponent(entityId, "position");
    if (posComponent) {
      posComponent.x = position.x;
      posComponent.y = position.y;
      posComponent.z = position.z || 0;

      // Update chat bubble position
      if (this.onRemotePlayerPositionUpdate) {
        this.onRemotePlayerPositionUpdate(playerId, {
          x: position.x,
          y: position.y - 50,
        });
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
    console.log(
      "[NETWORK] Received WORLD_STATE with",
      message.players.length,
      "players and",
      message.entities?.length || 0,
      "entities"
    );

    // Create a simple hash of the world state to detect changes
    const stateHash = this.createWorldStateHash(
      message.players,
      message.entities
    );

    // Only process if the world state actually changed
    if (stateHash === this.lastWorldStateHash) {
      console.log("[NETWORK] World state unchanged, skipping");
      return; // Skip processing if nothing changed - no re-renders triggered
    }

    this.lastWorldStateHash = stateHash;

    // Sync all players from server state
    // This is useful for initial connection or resync
    for (const player of message.players) {
      // Skip updating local player position - we handle that with prediction and reconciliation
      if (player.id === this.localPlayerId) continue;

      const entityId = this.remotePlayers.get(player.id);

      if (entityId) {
        // Update existing remote player - only update if values changed
        const posComponent = this.world.getComponent(entityId, "position");
        if (posComponent) {
          // Only update if position actually changed
          if (
            posComponent.x !== player.position.x ||
            posComponent.y !== player.position.y ||
            posComponent.z !== (player.position.z || 0)
          ) {
            posComponent.x = player.position.x;
            posComponent.y = player.position.y;
            posComponent.z = player.position.z || 0;
          }
        }

        if (player.velocity) {
          const velComponent = this.world.getComponent(entityId, "velocity");
          if (velComponent) {
            // Only update if velocity actually changed
            if (
              velComponent.vx !== player.velocity.vx ||
              velComponent.vy !== player.velocity.vy
            ) {
              velComponent.vx = player.velocity.vx;
              velComponent.vy = player.velocity.vy;
            }
          }
        }

        const statsComponent = this.world.getComponent(entityId, "stats");
        if (statsComponent) {
          // Only update if stats actually changed
          if (
            statsComponent.hp !== player.stats.hp ||
            statsComponent.maxHp !== player.stats.maxHp
          ) {
            statsComponent.hp = player.stats.hp;
            statsComponent.maxHp = player.stats.maxHp;
          }
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

    // Sync all entities from server state (including GameObjects)
    for (const entityData of message.entities || []) {
      // Skip player entities (already handled above)
      const hasPlayerComponent = entityData.components.some(
        (c: any) => c.type === "player"
      );
      const hasGameObjectComponent = entityData.components.some(
        (c: any) => c.type === "gameObject"
      );

      if (hasPlayerComponent) continue;

      let entityId = entityData.id
        ? this.remoteEntities.get(entityData.id)
        : undefined;

      if (!entityId && entityData.id) {
        // Create new entity
        entityId = this.world.createEntity();
        // entityData.id is guaranteed to be defined here due to the if condition above
        const serverEntityId = entityData.id!;
        this.remoteEntities.set(serverEntityId, entityId);
        this.clientToServerEntities.set(entityId, serverEntityId);

        // Add all components from server
        for (const component of entityData.components) {
          this.world.addComponent(entityId, component);
        }

        if (hasGameObjectComponent) {
          console.log(
            `[NETWORK] Created game object entity ${entityData.id} (${entityId}) from world state`
          );
        } else {
          console.log(
            `Created non-game-object entity ${entityData.id || "unknown"} (${entityId}) from world state`
          );
        }
      } else {
        // Update existing entity components
        for (const component of entityData.components) {
          const existingComponent = this.world.getComponent(
            entityId,
            component.type
          );
          if (!existingComponent) {
            this.world.addComponent(entityId, component);
          } else {
            // Update component properties (simple shallow merge for now)
            Object.assign(existingComponent, component);
          }
        }
      }
    }
  }

  private createRemotePlayerFromWorldState(playerData: {
    id: string;
    name: string;
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
      name: playerData.name,
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

    // Clean up remote entities
    for (const [entityServerId, entityId] of this.remoteEntities) {
      this.world.destroyEntity(entityId);
    }
    this.remoteEntities.clear();
    this.clientToServerEntities.clear();

    this.localPlayerId = undefined;
  }

  // Create a simple hash of world state for change detection
  private createWorldStateHash(
    players: Array<{
      id: string;
      position: { x: number; y: number; z?: number };
      velocity?: { vx: number; vy: number };
      stats: { hp: number; maxHp: number; level: number };
      spriteId?: string;
      frame?: number;
    }>,
    entities?: Array<{ id: string; components: any[] }>
  ): string {
    // Sort players by ID for consistent hashing
    const sortedPlayers = [...players].sort((a, b) => a.id.localeCompare(b.id));

    // Create hash string from key player data
    const hashParts: string[] = [];
    for (const player of sortedPlayers) {
      // Skip local player in hash since we don't update it from world state
      if (player.id === this.localPlayerId) continue;

      hashParts.push(
        `${player.id}:${Math.round(player.position.x)},${Math.round(player.position.y)},${player.stats.hp},${player.stats.maxHp}`
      );
    }

    // Include entity count and basic info in hash to detect entity changes
    if (entities) {
      const gameObjectCount = entities.filter((e) =>
        e.components.some((c: any) => c.type === "gameObject")
      ).length;
      const totalEntities = entities.length;
      hashParts.push(`entities:${totalEntities}:${gameObjectCount}`);
    }

    return hashParts.join("|");
  }

  private handleChatMessage(message: ChatMessage) {
    console.log(
      `[NETWORK] Received chat message: "${message.message}" from ${message.playerName} (mode: ${message.mode})`
    );
    // Call the chat message callback if set
    if (this.onChatMessage) {
      this.onChatMessage(message);
    } else {
      console.log(`[NETWORK] No chat message callback set!`);
    }
  }

  private handleTargetInfo(message: TargetInfoMessage) {
    console.log(
      `[NETWORK] Received TARGET_INFO for ${message.targetEntityId}: "${message.targetInfo.name}"`
    );

    // Call the target update callback if set
    if (this.onTargetUpdate) {
      console.log(`[NETWORK] Calling onTargetUpdate callback`);
      this.onTargetUpdate({
        entityId: message.targetEntityId,
        info: message.targetInfo,
      });
    } else {
      console.log(`[NETWORK] No onTargetUpdate callback set!`);
    }
  }

  private handleInventoryUpdate(message: InventoryUpdateMessage) {
    console.log(
      `[NETWORK] Received INVENTORY_UPDATE for player ${message.playerId}`
    );

    // Convert server inventory format to client format
    const clientInventory = {
      slots: message.inventory.slots.map((slot) => {
        if (!slot) return null;

        // Get item template for additional data
        const template = ITEM_TEMPLATES[slot.itemId];
        if (!template) return null;

        return {
          itemId: slot.itemId,
          name: template.name,
          icon: template.icon || "❓",
          quantity: slot.quantity,
          rarity: template.rarity,
          durability: slot.durability,
          maxDurability: template.maxDurability,
          description: template.description,
        };
      }),
      maxSlots: message.inventory.maxSlots,
    };

    // Update player store
    if (this.onPlayerUpdate) {
      this.onPlayerUpdate({
        inventory: clientInventory,
      });
    }
  }

  private handleHarvestResult(message: HarvestResultMessage) {
    console.log(
      `[NETWORK] Received HARVEST_RESULT for ${message.gameObjectId}: ${message.success ? "SUCCESS" : "FAILED"}`
    );

    if (!message.success) {
      console.log(`[HARVEST] Harvest failed: ${message.reason}`);
      return;
    }

    // Remove the harvested game object from the client world
    // The server will send a new WORLD_STATE with updated entities
    const gameObjectEntityId = this.remoteEntities.get(message.gameObjectId);
    if (gameObjectEntityId) {
      console.log(
        `[HARVEST] Removing depleted game object ${message.gameObjectId} (${gameObjectEntityId}) from client world`
      );
      this.world.destroyEntity(gameObjectEntityId);
      this.remoteEntities.delete(message.gameObjectId);
      this.clientToServerEntities.delete(gameObjectEntityId);
    }

    // Update player's inventory if items were gained
    if (message.itemsGained && message.itemsGained.length > 0) {
      console.log(`[HARVEST] Player gained items:`, message.itemsGained);

      // Trigger inventory update through player store callback
      if (this.onPlayerUpdate) {
        // We'll need to get the current inventory and add the new items
        // For now, just log that items were gained - the next INVENTORY_UPDATE will sync properly
        console.log(
          `[HARVEST] Items gained: ${message.itemsGained.map((item) => `${item.quantity}x ${item.itemId}`).join(", ")}`
        );
      }
    }

    if (message.xpGained && message.xpGained > 0) {
      console.log(`[HARVEST] Gained ${message.xpGained} XP`);
    }
  }

  // Send a harvest request
  harvestObject(clientEntityId: string) {
    console.log(
      `[CLIENT HARVEST] Attempting to harvest object: ${clientEntityId}`
    );

    if (!this.localPlayerId) {
      console.log(`[CLIENT HARVEST] Cannot harvest - no local player ID`);
      return;
    }

    // Find the server entity ID that corresponds to this client entity ID
    const serverEntityId = this.clientToServerEntities.get(clientEntityId);

    if (!serverEntityId) {
      console.log(
        `[CLIENT HARVEST] Could not find server entity ID for client entity ${clientEntityId}`
      );
      return;
    }

    console.log(
      `[CLIENT HARVEST] Found server entity ID: ${serverEntityId} for client entity ${clientEntityId}`
    );

    const harvestMessage = {
      type: "HARVEST_OBJECT" as const,
      timestamp: Date.now(),
      gameObjectId: serverEntityId,
    };

    console.log(`[CLIENT HARVEST] Sending harvest message:`, harvestMessage);
    this.client.send(harvestMessage);
  }

  // Send a chat message
  sendChatMessage(
    message: string,
    mode: "say" | "guild" | "party" | "global" = "say"
  ) {
    console.log(`[CLIENT CHAT] Sending message: "${message}" (mode: ${mode})`);

    if (!this.localPlayerId || !message.trim()) {
      console.log(
        `[CLIENT CHAT] Cannot send - localPlayerId: ${this.localPlayerId}, message: "${message}"`
      );
      return;
    }

    const chatMessage: ChatMessage = {
      type: "CHAT_MESSAGE",
      timestamp: Date.now(),
      playerId: this.localPlayerId,
      playerName: "", // Will be set by server
      message: message.trim(),
      mode,
    };

    console.log(`[CLIENT CHAT] Sending to server:`, chatMessage);
    this.client.send(chatMessage);
  }

  private setupDisconnectHandling() {
    // Import the game store here to avoid circular imports
    import("../stores").then(({ useGameStore }) => {
      this.client.setDisconnectCallback(() => {
        console.log("[NETWORK] Disconnected from server");
        const store = useGameStore.getState();
        store.setLoggedIn(false);
        store.setIsReconnecting(true);
        store.setConnectionStatus("disconnected");
        store.setConnected(false);
      });
    });
  }
}
