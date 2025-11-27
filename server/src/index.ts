// Server entry point
import { DatabaseService } from "./db";
import { WebSocketServer } from "./core/network";
import { createWorld } from "./core/world";
import { registerAllHandlers } from "./core/handlers";

async function main() {
  console.log("Starting Ironwild server...");

  // Initialize database
  await DatabaseService.initialize();

  // Create the world singleton
  const world = createWorld();

  // Initialize WebSocket server
  const wsServer = new WebSocketServer(8080);

  // Wire up session management
  wsServer.onConnection((client) => {
    // Create session in the world
    const session = world.createSession(client);

    // Set up the session's send method to use WebSocket
    session.send = (message: any) => {
      wsServer.sendToClient(client, message);
    };

    console.log(`Session created for client ${client.id}`);
  });

  wsServer.onDisconnection((client) => {
    world.removeSession(client.id);
    console.log(`Session removed for client ${client.id}`);
  });

  // Initialize world objects
  const worldSize = { width: 2000, height: 2000 };
  world.initializeWorldObjects(worldSize);

  // Register all message handlers
  registerAllHandlers(wsServer, world);

  // Game tick loop (server-side)
  const TICK_RATE = 20; // 20 ticks per second
  const TICK_INTERVAL = 1000 / TICK_RATE;

  setInterval(async () => {
    const deltaTime = 1 / TICK_RATE;
    world.update(deltaTime);

    // Clean up inactive connections periodically
    await wsServer.cleanupInactiveConnections();
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
