// Server entry point
import { ServerWorld } from "./ecs/world";
import { DatabaseService } from "./db";
import { CombatSystem } from "./systems/CombatSystem";
import { MovementSystem } from "./systems/MovementSystem";
import { TradeskillSystem } from "./systems/TradeskillSystem";
import { WebSocketServer } from "./net/websocketServer";
import { PlayerManager } from "./net/playerManager";
import { BroadcastSystem } from "./systems/BroadcastSystem";
import {
  PlayerJoinRequestMessage,
  WorldStateMessage,
} from "../../shared/messages/index";

async function main() {
  console.log("Starting Ironwild server...");

  // Initialize database
  await DatabaseService.initialize();

  // Initialize ECS world
  const world = new ServerWorld();

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(8080);

  // Initialize player manager
  const playerManager = new PlayerManager(wsServer, world);

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
      const playerName =
        message.playerName || `Adventurer_${Date.now().toString().slice(-4)}`;
      playerManager.createPlayer(client, {
        name: playerName,
        playerId: message.playerId,
      });
      console.log(
        `Player ${message.playerName} joined from client ${client.id}`
      );

      // Send current world state to the new player so they see existing players
      const currentPlayers = playerManager.getAllPlayers();
      const worldStateMessage: WorldStateMessage = {
        type: "WORLD_STATE",
        timestamp: Date.now(),
        players: currentPlayers,
      };
      wsServer.sendToClient(client, worldStateMessage);
    }
  );

  // Add systems
  world.addSystem(new CombatSystem());
  world.addSystem(new MovementSystem(playerManager));
  world.addSystem(new TradeskillSystem());
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
