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
import { useGameStore, usePlayerStore } from './stores';

import { UIInterface } from "./ui/ui-interface"

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameInitializedRef = useRef(false);

  const { setConnected, setConnectionStatus, updateFPS } = useGameStore();
  const { setPlayer } = usePlayerStore();

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

    // Add systems
    const renderSystem = new RenderSystem(canvas);
    const movementSystem = new MovementSystem();
    const inputSystem = new InputSystem(canvas);

    // Connect input system to network system
    inputSystem.setNetworkSystem(networkSystem);

    world.addSystem(inputSystem);
    world.addSystem(movementSystem);
    world.addSystem(networkSystem);
    world.addSystem(interpolationSystem);
    world.addSystem(renderSystem);

    // Create local player entity
    const localPlayerEntityId = world.createEntity();
    const localPlayerId = `local_player_${Date.now()}`;

    world.addComponent(localPlayerEntityId, {
      type: 'position',
      x: 400,
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
      id: localPlayerId,
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

    // Update player store with initial data
    setPlayer({
      id: localPlayerId,
      name: 'Player',
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

    // Set up local player in network system
    networkSystem.setLocalPlayer(localPlayerId, localPlayerEntityId);

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
          gameClient.setPlayerId(localPlayerId);

          // Send join request to create player on server
          const joinMessage: PlayerJoinRequestMessage = {
            type: 'PLAYER_JOIN_REQUEST',
            timestamp: Date.now(),
            playerName: 'Player',
            playerId: localPlayerId,
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
    <div className="relative h-screen w-screen overflow-hidden bg-green-600">
      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-auto"
        style={{
          imageRendering: 'pixelated',
        }}
      />

      {/* UI Overlay */}
      <UIInterface />
    </div>
  )
}

export default App;
