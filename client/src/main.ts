// Client entry point
import { ClientWorld } from "./ecs/world";
import { RenderSystem } from "./ecs/systems/renderSystem";
import { MovementSystem } from "./ecs/systems/movementSystem";
import { InputSystem } from "./ecs/systems/inputSystem";
import { GameClient } from "./net/client";
import { NetworkSystem } from "./net/networkSystem";
import { InterpolationSystem } from "./net/interpolation";
import { PlayerJoinRequestMessage } from "../../shared/messages/index";

// Initialize canvas
const canvas = document.createElement("canvas");
canvas.width = 800;
canvas.height = 600;
canvas.style.border = "1px solid #000";
document.body.appendChild(canvas);

// Initialize ECS world
const world = new ClientWorld();

// Initialize network client
const gameClient = new GameClient("ws://localhost:8080");
const interpolationSystem = new InterpolationSystem();
const networkSystem = new NetworkSystem(gameClient, world, interpolationSystem);

// Add systems
const renderSystem = new RenderSystem(canvas);
const movementSystem = new MovementSystem();
const inputSystem = new InputSystem(canvas);

world.addSystem(inputSystem);
world.addSystem(movementSystem);
world.addSystem(networkSystem);
world.addSystem(interpolationSystem);
world.addSystem(renderSystem);

// Create local player entity
const localPlayerEntityId = world.createEntity();
const localPlayerId = `local_player_${Date.now()}`;

world.addComponent(localPlayerEntityId, {
  type: "position",
  x: 400,
  y: 300,
  z: 0,
});
world.addComponent(localPlayerEntityId, {
  type: "velocity",
  vx: 0,
  vy: 0,
});
world.addComponent(localPlayerEntityId, {
  type: "renderable",
  spriteId: "player",
  layer: 1,
  frame: 0,
});
world.addComponent(localPlayerEntityId, {
  type: "player",
  id: localPlayerId,
  name: "Player",
  isLocal: true,
});
world.addComponent(localPlayerEntityId, {
  type: "stats",
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  attack: 10,
  defense: 5,
  moveSpeed: 100,
});

// Set up local player in network system
networkSystem.setLocalPlayer(localPlayerId, localPlayerEntityId);

// Connect to server with a small delay to avoid hot reload issues
setTimeout(() => {
  gameClient
    .connect()
    .then(() => {
      console.log("Connected to game server!");
      gameClient.setPlayerId(localPlayerId);

      // Send join request to create player on server
      const joinMessage: PlayerJoinRequestMessage = {
        type: "PLAYER_JOIN_REQUEST",
        timestamp: Date.now(),
        playerName: "Player", // TODO: Get from user input
      };
      gameClient.send(joinMessage);
      console.log("Sent join request to server");
    })
    .catch((error) => {
      console.error("Failed to connect to server:", error);
      // Continue running in offline mode
    });
}, 100); // Small delay to let Vite stabilize

// Game loop
let lastTime = 0;
function gameLoop(currentTime: number) {
  const deltaTime = (currentTime - lastTime) / 1000; // Convert to seconds
  lastTime = currentTime;

  world.update(deltaTime);

  requestAnimationFrame(gameLoop);
}

// Start game loop
requestAnimationFrame(gameLoop);

console.log("Ironwild client started!");
