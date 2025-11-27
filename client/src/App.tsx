"use client"

import { useEffect, useRef } from "react"

import { ClientWorld } from './ecs/world';
import { RenderSystem } from './ecs/systems/renderSystem';
import { MovementSystem } from './ecs/systems/movementSystem';
import { InputSystem } from './ecs/systems/inputSystem';
import { GameClient } from './net/client';
import { NetworkSystem } from './net/networkSystem';
import { InterpolationSystem } from './net/interpolation';
import { PlayerJoinRequestMessage } from '../../shared/messages/index';
import { useGameStore, usePlayerStore, useChatStore, useChatBubbleStore } from './stores';

import { UIInterface } from "./ui/ui-interface"

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameInitializedRef = useRef(false);
  const networkSystemRef = useRef<any>(null);

  const { setConnected, setConnectionStatus, updateFPS } = useGameStore();
  const { setPlayer } = usePlayerStore();
  const { addMessage } = useChatStore();
  const { addBubble, cleanupExpiredBubbles, updateBubblePosition } = useChatBubbleStore();

  useEffect(() => {
    if (gameInitializedRef.current || !canvasRef.current) return;
    gameInitializedRef.current = true;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize ECS world
    const world = new ClientWorld();

    // Initialize network client
    const gameClient = new GameClient('ws://localhost:8080');
    const interpolationSystem = new InterpolationSystem();
    const networkSystem = new NetworkSystem(gameClient, world, interpolationSystem);
    networkSystemRef.current = networkSystem;

    // Add systems
    const renderSystem = new RenderSystem(canvas);
    const movementSystem = new MovementSystem();
    const inputSystem = new InputSystem(canvas);

    // Connect input system to network system
    inputSystem.setNetworkSystem(networkSystem);

    // Set up chat message handling
    console.log('[APP] Setting up chat message callback');
    networkSystem.setChatMessageCallback((message) => {
      console.log('[APP] Chat callback called:', message);
      addMessage(message);

      // Create chat bubble above the player (if not our own message)
      if (message.playerId !== networkSystem.getLocalPlayerId()) {
        // Find the player's position in the world
        const playerEntities = world.getEntitiesWithComponent('player');
        const playerEntity = playerEntities.find(entityId => {
          const playerComponent = world.getComponent(entityId, 'player') as any;
          return playerComponent && playerComponent.id === message.playerId;
        });

        if (playerEntity) {
          const positionComponent = world.getComponent(playerEntity, 'position') as any;
          if (positionComponent) {
            // Position bubble above player's head (50px above)
            const bubblePosition = {
              x: positionComponent.x,
              y: positionComponent.y - 50
            };

            addBubble({
              playerId: message.playerId,
              playerName: message.playerName,
              message: message.message,
              position: bubblePosition,
              duration: 5000, // 5 seconds
            });
          }
        }
      }
    });

    // Set up player position update callback for chat bubbles
    networkSystem.setRemotePlayerPositionUpdateCallback((playerId: string, position: { x: number; y: number }) => {
      updateBubblePosition(playerId, position);
    });

    world.addSystem(inputSystem);
    world.addSystem(movementSystem);
    world.addSystem(networkSystem);
    world.addSystem(interpolationSystem);
    world.addSystem(renderSystem);

    // Create local player entity (will be updated with server-assigned ID later)
    const localPlayerEntityId = world.createEntity();
    const tempPlayerId = `temp_local_${Date.now()}`;

    world.addComponent(localPlayerEntityId, {
      type: 'position',
      x: 400, // Match server spawn position
      y: 300,
      z: 0,
    });
    world.addComponent(localPlayerEntityId, {
      type: 'velocity',
      vx: 0,
      vy: 0,
    });
    world.addComponent(localPlayerEntityId, {
      type: 'renderable',
      spriteId: 'player',
      layer: 1,
      frame: 0,
    });
    world.addComponent(localPlayerEntityId, {
      type: 'player',
      id: tempPlayerId,
      name: 'Player',
      isLocal: true,
    });
    world.addComponent(localPlayerEntityId, {
      type: 'stats',
      hp: 100,
      maxHp: 100,
      mp: 50,
      maxMp: 50,
      attack: 10,
      defense: 5,
      moveSpeed: 100,
    });

    // Tell network system about the temp entity
    networkSystem.setTempLocalEntity(localPlayerEntityId);

    // Set callback to update player store position
    networkSystem.setPlayerPositionUpdateCallback((position) => {
      setPlayer({ position });
    });

    // Set callback to update player store with server data
    networkSystem.setPlayerUpdateCallback((playerData) => {
      setPlayer(playerData);
    });

    // Update player store with initial data (will be updated with server data later)
    setPlayer({
      id: tempPlayerId,
      name: 'Connecting...',
      stats: {
        hp: 100,
        maxHp: 100,
        mp: 50,
        maxMp: 50,
        attack: 10,
        defense: 5,
        moveSpeed: 100,
        level: 1,
        experience: 0,
        experienceToNext: 100,
      },
      position: { x: 400, y: 300, z: 0 },
      isConnected: false,
      isLocal: true,
    });

    // Connect to server with a small delay
    setTimeout(() => {
      setConnectionStatus('connecting');
      gameClient
        .connect()
        .then(() => {
          console.log('Connected to game server!');
          setConnected(true);
          setConnectionStatus('connected');
          setPlayer({ isConnected: true });

          // Send join request to create player on server
          const joinMessage: PlayerJoinRequestMessage = {
            type: 'PLAYER_JOIN_REQUEST',
            timestamp: Date.now(),
            // Let server generate the player name
            // Don't send playerId - server will assign one
          };
          gameClient.send(joinMessage);
          console.log('Sent join request to server');
        })
        .catch((error) => {
          console.error('Failed to connect to server:', error);
          setConnectionStatus('error');
          // Continue running in offline mode
        });
    }, 100);

    // Game loop
    let lastTime = 0;
    let frameCount = 0;
    let fpsTime = 0;

    function gameLoop(currentTime: number) {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 1 / 30); // Cap delta time to prevent large jumps
      lastTime = currentTime;

      // Update FPS counter
      frameCount++;
      fpsTime += deltaTime;
      if (fpsTime >= 1.0) {
        updateFPS(Math.round(frameCount / fpsTime));
        frameCount = 0;
        fpsTime = 0;
      }

      // Clean up expired chat bubbles
      cleanupExpiredBubbles();

      world.update(deltaTime);
      requestAnimationFrame(gameLoop);
    }

    // Start game loop
    requestAnimationFrame(gameLoop);

    console.log('Ironwild client started!');

    // Cleanup function
    return () => {
      gameClient.disconnect();
    };
  }, [setConnected, setConnectionStatus, setPlayer, updateFPS]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* UI Overlay */}
      <UIInterface onSendChatMessage={(message, mode) => networkSystemRef.current?.sendChatMessage(message, mode)} />
    </div>
  )
}

export default App;
