// Server entry point
import { ServerWorld } from "./ecs/world";
import { DatabaseService } from "./db";
import { CombatSystem } from "./systems/CombatSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { TradeskillSystem } from "./systems/TradeskillSystem";
import { ItemSystem } from "./systems/ItemSystem";
import { GameObjectSpawner } from "./world/spawners/GameObjectSpawner";
import { WebSocketServer } from "./net/websocketServer";
import { PlayerManager } from "./net/playerManager";
import { BroadcastSystem } from "./systems/BroadcastSystem";
import {
  PlayerJoinRequestMessage,
  WorldStateMessage,
  SetTargetMessage,
  ClearTargetMessage,
  TargetInfoMessage,
  HarvestObjectMessage,
  HarvestResultMessage,
} from "../../shared/messages/index";

async function main() {
  console.log("Starting Ironwild server...");

  // Initialize database
  await DatabaseService.initialize();

  // Initialize ECS world
  const world = new ServerWorld();

  // Initialize GameObject spawner and spawn world objects
  const gameObjectSpawner = new GameObjectSpawner(world);
  const worldSize = { width: 2000, height: 2000 }; // Define world bounds
  gameObjectSpawner.spawnWorldObjects(worldSize);

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(8080);

  // Initialize systems
  const itemSystem = new ItemSystem(wsServer);
  itemSystem.setWorld(world);

  // Initialize player manager
  const playerManager = new PlayerManager(wsServer, world, itemSystem);

  // Connect player manager to WebSocket server for cleanup
  wsServer.setPlayerManager(playerManager);

  // Handle player join requests
  wsServer.onMessage(
    "PLAYER_JOIN_REQUEST",
    (client, message: PlayerJoinRequestMessage) => {
      // Only allow one player per client connection
      if (client.playerId) {
        console.log(
          `Client ${client.id} already has player ${client.playerId}, ignoring join request`
        );
        return;
      }

      // Create the player
      console.log(
        `Received PLAYER_JOIN_REQUEST with playerName: "${message.playerName}" from client ${client.id}`
      );
      const playerName =
        message.playerName || `Adventurer_${Date.now().toString().slice(-4)}`;
      console.log(`Using player name: "${playerName}"`);
      playerManager.createPlayer(client, {
        name: playerName,
        playerId: message.playerId,
      });
      console.log(`Player ${playerName} joined from client ${client.id}`);

      // Send current world state to the new player so they see existing players and entities
      const currentPlayers = playerManager.getAllPlayers();
      const currentEntities = world.getEntitiesForSync();
      console.log(
        `[SERVER] Sending WORLD_STATE to client ${client.id} with ${currentPlayers.length} players:`,
        currentPlayers.map((p) => `${p.id}(${p.name})`)
      );
      const worldStateMessage: WorldStateMessage = {
        type: "WORLD_STATE",
        timestamp: Date.now(),
        players: currentPlayers,
        entities: currentEntities,
      };
      wsServer.sendToClient(client, worldStateMessage);
    }
  );

  // Handle target setting
  wsServer.onMessage(
    "SET_TARGET" as any,
    (client, message: SetTargetMessage) => {
      if (!client.playerId) return;

      console.log(
        `Player ${client.playerId} targeting entity ${message.targetEntityId}`
      );

      // Get target information
      const targetInfo = playerManager.getTargetInfo(message.targetEntityId);
      console.log(`Target info result:`, targetInfo);
      if (targetInfo) {
        const targetMessage: TargetInfoMessage = {
          type: "TARGET_INFO" as any,
          timestamp: Date.now(),
          targetEntityId: message.targetEntityId,
          targetInfo,
        };
        console.log(`Sending target info:`, targetMessage);
        wsServer.sendToClient(client, targetMessage);
      } else {
        console.log(
          `No target info found for entity ${message.targetEntityId}`
        );
      }
    }
  );

  // Handle target clearing
  wsServer.onMessage(
    "CLEAR_TARGET" as any,
    (client, message: ClearTargetMessage) => {
      if (!client.playerId) return;

      console.log(`[SERVER] Player ${client.playerId} clearing target`);

      // Send empty target info to clear the UI
      const clearTargetMessage: TargetInfoMessage = {
        type: "TARGET_INFO",
        timestamp: Date.now(),
        targetEntityId: "",
        targetInfo: {
          name: "",
          type: "player",
          position: { x: 0, y: 0, z: 0 },
        },
      };
      console.log(`[SERVER] Sending clear target message:`, clearTargetMessage);
      wsServer.sendToClient(client, clearTargetMessage);
    }
  );

  // Handle object harvesting
  wsServer.onMessage(
    "HARVEST_OBJECT" as any,
    async (client, message: HarvestObjectMessage) => {
      if (!client.playerId) return;

      console.log(
        `Player ${client.playerId} attempting to harvest ${message.gameObjectId}`
      );

      const result = await tradeskillSystem.harvest(
        client.playerId,
        message.gameObjectId
      );

      const harvestResultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: result.success,
        reason: result.reason,
        xpGained: result.xpGained,
      };

      wsServer.sendToClient(client, harvestResultMessage);
    }
  );

  // Initialize and add systems
  const tradeskillSystem = new TradeskillSystem(itemSystem);
  tradeskillSystem.setWorld(world);

  world.addSystem(new CombatSystem());
  world.addSystem(new MovementSystem(playerManager));
  world.addSystem(tradeskillSystem);
  world.addSystem(itemSystem);
  world.addSystem(new BroadcastSystem(wsServer, playerManager));

  // Create a test NPC entity
  const npcId = world.createEntity();
  world.addComponent(npcId, {
    type: "position",
    x: 100,
    y: 100,
    z: 0,
  });
  world.addComponent(npcId, {
    type: "renderable",
    spriteId: "npc_guard",
    layer: 1,
    frame: 0,
  });
  world.addComponent(npcId, {
    type: "stats",
    hp: 200,
    maxHp: 200,
    mp: 0,
    maxMp: 0,
    attack: 15,
    defense: 10,
    moveSpeed: 0, // Stationary NPC
  });

  // Game tick loop (server-side)
  const TICK_RATE = 20; // 20 ticks per second
  const TICK_INTERVAL = 1000 / TICK_RATE;

  setInterval(() => {
    const deltaTime = 1 / TICK_RATE;
    world.update(deltaTime);

    // Clean up inactive connections periodically
    wsServer.cleanupInactiveConnections();
  }, TICK_INTERVAL);

  console.log("Ironwild server running!");
  console.log(`Tick rate: ${TICK_RATE} TPS`);
  console.log("WebSocket server listening on port 8080");

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    wsServer.close();
    await DatabaseService.close();
    process.exit(0);
  });
}

main().catch(console.error);
