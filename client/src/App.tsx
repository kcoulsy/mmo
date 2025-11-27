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
import { LoginScreen } from "./ui/login-screen"

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameInitializedRef = useRef(false);
  const networkSystemRef = useRef<any>(null);
  const gameClientRef = useRef<GameClient | null>(null);
  const worldRef = useRef<any>(null);

  const {
    setConnected,
    setConnectionStatus,
    updateFPS,
    isLoggedIn,
    setLoggedIn,
    setPlayerName,
    setIsReconnecting
  } = useGameStore();
  const { setPlayer, setTarget, clearTarget } = usePlayerStore();
  const { addMessage } = useChatStore();
  const { addBubble, cleanupExpiredBubbles, updateBubblePosition } = useChatBubbleStore();

  // Initialize game world when logged in
  useEffect(() => {
    console.log('[APP] useEffect triggered - isLoggedIn:', isLoggedIn, 'gameInitialized:', gameInitializedRef.current, 'canvasRef:', !!canvasRef.current);
    if (!isLoggedIn || gameInitializedRef.current || !canvasRef.current) return;
    console.log('[APP] Calling initializeGame');
    initializeGame();
  }, [isLoggedIn]);

  // Handle disconnects - this will be set up in the network system

  const initializeGame = () => {
    console.log('[APP] initializeGame called');
    if (gameInitializedRef.current || !canvasRef.current || !worldRef.current) {
      console.log('[APP] initializeGame early return - initialized:', gameInitializedRef.current, 'canvas:', !!canvasRef.current, 'world:', !!worldRef.current);
      return;
    }
    gameInitializedRef.current = true;
    console.log('[APP] initializeGame proceeding');

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    console.log('[APP] Canvas dimensions set to:', canvas.width, 'x', canvas.height);

    // Reuse existing world and network system from login
    const world = worldRef.current;
    const networkSystem = networkSystemRef.current;

    // Add systems
    const renderSystem = new RenderSystem(canvas);
    const movementSystem = new MovementSystem();
    const inputSystem = new InputSystem(canvas);

    // Connect input system to network system
    inputSystem.setNetworkSystem(networkSystem);
    inputSystem.setRenderSystem(renderSystem);

    // Set up chat message handling
    console.log('[APP] Setting up chat message callback');
    networkSystem.setChatMessageCallback((message: any) => {
      console.log('[APP] Chat callback called:', message);
      addMessage(message);

      // Create chat bubble above the player (if not our own message)
      if (message.playerId !== networkSystem.getLocalPlayerId()) {
        // Find the player's position in the world
        const playerEntities = world.getEntitiesWithComponent('player');
        const playerEntity = playerEntities.find((entityId: any) => {
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

    // Create interpolation system for smooth movement
    const interpolationSystem = new InterpolationSystem();

    world.addSystem(inputSystem);
    world.addSystem(movementSystem);
    world.addSystem(networkSystem);
    world.addSystem(interpolationSystem);
    world.addSystem(renderSystem);

    // Set callback to update player store position
    networkSystem.setPlayerPositionUpdateCallback((position: any) => {
      setPlayer({ position });
    });

    // Set callback to update player store with server data
    networkSystem.setPlayerUpdateCallback((playerData: any) => {
      console.log('[APP] Updating player store with:', playerData);
      setPlayer(playerData);
    });

    // Set callback for when player successfully joins with initial data
    networkSystem.setPlayerJoinedCallback(() => {
      console.log('[APP] Player successfully joined with initial data, showing game');
      setLoggedIn(true);
      setIsReconnecting(false);
    });

    // Set callback to update target information
    networkSystem.setTargetUpdateCallback((targetData: any) => {
      console.log(`[APP] Target update:`, targetData);
      if (targetData.info && targetData.info.name) {
        console.log(`[APP] Setting target to: ${targetData.info.name}`);
        setTarget({
          entityId: targetData.entityId,
          ...targetData.info,
        });
      } else {
        console.log(`[APP] Clearing target`);
        clearTarget();
      }
    });


    // Game loop
    let lastTime = 0;
    let frameCount = 0;
    let fpsTime = 0;

    function gameLoop(currentTime: number) {
      // Debug: log every frame for first few frames
      if (frameCount < 5) {
        console.log('[GAME] Game loop frame', frameCount, 'currentTime:', currentTime);
      }

      const deltaTime = Math.min((currentTime - lastTime) / 1000, 1 / 30); // Cap delta time to prevent large jumps
      lastTime = currentTime;

      // Debug: log every 60 frames (about once per second at 60fps)
      if (frameCount % 60 === 0) {
        console.log('[GAME] Game loop running, deltaTime:', deltaTime, 'fpsTime:', fpsTime);
      }

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
    console.log('[APP] Starting game loop');
    requestAnimationFrame(gameLoop);

    console.log('Ironwild client started!');
  };

  const handleLogin = async (playerName: string) => {
    setPlayerName(playerName);
    setConnectionStatus('connecting');

    try {
      // Initialize ECS world and network system for login
      const world = new ClientWorld();
      worldRef.current = world;
      const gameClient = new GameClient('ws://localhost:8080');
      gameClientRef.current = gameClient;

      const interpolationSystem = new InterpolationSystem();
      const networkSystem = new NetworkSystem(gameClient, world, interpolationSystem);
      networkSystemRef.current = networkSystem;

      // Create temporary local player entity (will be updated with server data)
      const tempPlayerEntityId = world.createEntity();
      const tempPlayerId = `temp_local_${Date.now()}`;

      world.addComponent(tempPlayerEntityId, {
        type: 'position',
        x: 400, // Match server spawn position
        y: 300,
        z: 0,
      });
      world.addComponent(tempPlayerEntityId, {
        type: 'velocity',
        vx: 0,
        vy: 0,
      });
      world.addComponent(tempPlayerEntityId, {
        type: 'renderable',
        spriteId: 'player',
        layer: 1,
        frame: 0,
      });
      world.addComponent(tempPlayerEntityId, {
        type: 'player',
        id: tempPlayerId,
        name: playerName, // Use the entered name
        isLocal: true,
      });
      world.addComponent(tempPlayerEntityId, {
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
      networkSystem.setTempLocalEntity(tempPlayerEntityId);

      // Set up callbacks
      networkSystem.setPlayerJoinedCallback(() => {
        console.log('[APP] Player successfully joined with initial data, showing game');
        console.log('[APP] Setting isLoggedIn to true');
        setLoggedIn(true);
        setIsReconnecting(false);
      });

      // Set up disconnect handling
      gameClient.setDisconnectCallback(() => {
        console.log('[APP] Disconnected from server during login');
        setLoggedIn(false);
        setIsReconnecting(true);
        setConnectionStatus('disconnected');
        setConnected(false);
      });

      await gameClient.connect();
      console.log('Connected to game server!');
      setConnected(true);
      setConnectionStatus('connected');

      // Send join request to create player on server
      const joinMessage: PlayerJoinRequestMessage = {
        type: 'PLAYER_JOIN_REQUEST',
        timestamp: Date.now(),
        playerName: playerName,
      };
      gameClient.send(joinMessage);
      console.log('Sent join request to server with name:', playerName);

      // Wait for PLAYER_JOIN response before showing game
      // This will be handled by the network system's playerJoinedCallback

    } catch (error) {
      console.error('Failed to connect to server:', error);
      setConnectionStatus('error');
    }
  };

  const handleReconnect = async () => {
    setConnectionStatus('connecting');

    try {
      // Reinitialize ECS world and network system for reconnect
      const world = new ClientWorld();
      worldRef.current = world;
      const gameClient = new GameClient('ws://localhost:8080');
      gameClientRef.current = gameClient;

      const interpolationSystem = new InterpolationSystem();
      const networkSystem = new NetworkSystem(gameClient, world, interpolationSystem);
      networkSystemRef.current = networkSystem;

      // Create temporary local player entity (will be updated with server data)
      const tempPlayerEntityId = world.createEntity();
      const tempPlayerId = `temp_local_${Date.now()}`;

      world.addComponent(tempPlayerEntityId, {
        type: 'position',
        x: 400, // Match server spawn position
        y: 300,
        z: 0,
      });
      world.addComponent(tempPlayerEntityId, {
        type: 'velocity',
        vx: 0,
        vy: 0,
      });
      world.addComponent(tempPlayerEntityId, {
        type: 'renderable',
        spriteId: 'player',
        layer: 1,
        frame: 0,
      });
      world.addComponent(tempPlayerEntityId, {
        type: 'player',
        id: tempPlayerId,
        name: useGameStore.getState().playerName, // Use stored name
        isLocal: true,
      });
      world.addComponent(tempPlayerEntityId, {
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
      networkSystem.setTempLocalEntity(tempPlayerEntityId);

      // Set up callbacks
      networkSystem.setPlayerJoinedCallback(() => {
        console.log('[APP] Player successfully rejoined with initial data, showing game');
        setLoggedIn(true);
        setIsReconnecting(false);
      });

      // Set up disconnect handling
      gameClient.setDisconnectCallback(() => {
        console.log('[APP] Disconnected from server during reconnect');
        setLoggedIn(false);
        setIsReconnecting(true);
        setConnectionStatus('disconnected');
        setConnected(false);
      });

      await gameClient.connect();
      console.log('Reconnected to game server!');
      setConnected(true);
      setConnectionStatus('connected');

      // Send join request to rejoin with existing player data
      const joinMessage: PlayerJoinRequestMessage = {
        type: 'PLAYER_JOIN_REQUEST',
        timestamp: Date.now(),
        playerName: useGameStore.getState().playerName,
      };
      gameClient.send(joinMessage);
      console.log('Sent reconnect join request to server');

      // Wait for PLAYER_JOIN response before showing game
      // This will be handled by the network system's playerJoinedCallback

    } catch (error) {
      console.error('Failed to reconnect to server:', error);
      setConnectionStatus('error');
    }
  };

  // Show login screen if not logged in, otherwise show game
  if (!isLoggedIn) {
    return <LoginScreen onLogin={handleLogin} onReconnect={handleReconnect} />;
  }

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
