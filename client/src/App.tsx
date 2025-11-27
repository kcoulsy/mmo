"use client"

import { useEffect, useRef, useState } from "react"

import { ClientWorld } from './ecs/world';
import { RenderSystem } from './ecs/systems/renderSystem';
import { MovementSystem } from './ecs/systems/movementSystem';
import { InputSystem } from './ecs/systems/inputSystem';
import { GameClient } from './net/client';
import { NetworkSystem } from './net/networkSystem';
import { InterpolationSystem } from './net/interpolation';
import { PlayerJoinRequestMessage } from '../../shared/messages/index';
import { useGameStore, usePlayerStore, useChatStore, useChatBubbleStore, useUIStore, useKeybindStore } from './stores';

import { UIInterface } from "./ui/ui-interface"
import { LoginScreen } from "./ui/login-screen"

export function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameInitializedRef = useRef(false);
  const networkSystemRef = useRef<any>(null);
  const gameClientRef = useRef<GameClient | null>(null);
  const worldRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const systemsInitializedRef = useRef<boolean>(false);
  const inputSystemRef = useRef<any>(null);

  const [showGameMenu, setShowGameMenu] = useState(false);

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
    if (!isLoggedIn || gameInitializedRef.current || !canvasRef.current) return;

    initializeGame();
  }, [isLoggedIn]);


  // Handle disconnects - this will be set up in the network system

  const initializeGame = () => {
    if (gameInitializedRef.current || !canvasRef.current || !worldRef.current) {
      return;
    }
    gameInitializedRef.current = true;

    const canvas = canvasRef.current;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';

    // Reuse existing world and network system from login
    const world = worldRef.current;
    const networkSystem = networkSystemRef.current;

    // Add systems
    const renderSystem = new RenderSystem(canvas);
    const movementSystem = new MovementSystem();
    const inputSystem = new InputSystem(canvas);
    inputSystemRef.current = inputSystem;

    // Connect input system to network system
    inputSystem.setNetworkSystem(networkSystem);
    inputSystem.setRenderSystem(renderSystem);

    // Connect input system to UI toggle functions  
    inputSystem.setToggleGameMenuCallback(() => {
      setShowGameMenu(prev => !prev);
    });

    // Set up chat message handling
    networkSystem.setChatMessageCallback((message: any) => {
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
      setPlayer(playerData);
    });

    // Set callback for when player successfully joins with initial data
    networkSystem.setPlayerJoinedCallback(() => {
      setLoggedIn(true);
      setIsReconnecting(false);
    });

    // Set callback to update target information
    networkSystem.setTargetUpdateCallback((targetData: any) => {
      if (targetData.info && targetData.info.name) {
        setTarget({
          entityId: targetData.entityId,
          ...targetData.info,
        });
      } else {
        clearTarget();
      }
    });


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
      animationFrameRef.current = requestAnimationFrame(gameLoop);
    }

    // Start game loop
    animationFrameRef.current = requestAnimationFrame(gameLoop);

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
        setLoggedIn(true);
        setIsReconnecting(false);
      });

      // Set up disconnect handling
      gameClient.setDisconnectCallback(() => {
        setLoggedIn(false);
        setIsReconnecting(true);
        setConnectionStatus('disconnected');
        setConnected(false);
      });

      await gameClient.connect();
      setConnected(true);
      setConnectionStatus('connected');

      // Send join request to create player on server
      const joinMessage: PlayerJoinRequestMessage = {
        type: 'PLAYER_JOIN_REQUEST',
        timestamp: Date.now(),
        playerName: playerName,
      };
      gameClient.send(joinMessage);

      // Wait for PLAYER_JOIN response before showing game
      // This will be handled by the network system's playerJoinedCallback

    } catch (error) {
      console.error('Failed to connect to server:', error);
      setConnectionStatus('error');
    }
  };

  const handleReconnect = async () => {
    // Treat reconnect like a fresh login but with stored username
    const storedName = useGameStore.getState().playerName;
    if (storedName) {
      await handleLogin(storedName);
    } else {
      console.error('No stored player name for reconnect');
      setConnectionStatus('error');
    }
  };

  const handleDisconnect = () => {
    // Stop game loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Clean up input system
    if (inputSystemRef.current) {
      inputSystemRef.current.cleanup();
      inputSystemRef.current = null;
    }

    // Clean up network system
    if (networkSystemRef.current) {
      networkSystemRef.current.cleanup();
    }

    // Disconnect from server
    if (gameClientRef.current) {
      gameClientRef.current.disconnect();
    }

    // Reset game state
    setLoggedIn(false);
    setConnected(false);
    setConnectionStatus('disconnected');
    setIsReconnecting(false);
    setShowGameMenu(false);

    // Reset game initialization flag so we can reinitialize on reconnect
    gameInitializedRef.current = false;

    // Clear all stores to prevent stale data on reconnect
    usePlayerStore.getState().setPlayer({
      id: "",
      name: "Player",
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
      target: null,
      tradeskills: [
        {
          name: "Mining",
          level: 1,
          experience: 0,
          experienceToNext: 100,
          icon: "⛏️",
        },
        {
          name: "Woodcutting",
          level: 1,
          experience: 0,
          experienceToNext: 100,
          icon: "🪓",
        },
        {
          name: "Herbalism",
          level: 1,
          experience: 0,
          experienceToNext: 100,
          icon: "🌿",
        },
      ],
      inventory: {
        slots: new Array(32).fill(null),
        maxSlots: 32,
      },
    });

    useChatStore.getState().clearMessages();
    useChatBubbleStore.getState().cleanupExpiredBubbles(); // Clear all bubbles

    // Reset UI state
    useUIStore.setState({
      showBags: false,
      showCharacter: false,
      showTradeskills: false,
    });

    // Reset keybind state to defaults
    useKeybindStore.getState().resetToDefaults();

    // Clear game refs
    worldRef.current = null;
    networkSystemRef.current = null;
    gameClientRef.current = null;
    inputSystemRef.current = null;
    systemsInitializedRef.current = false;
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
      <UIInterface
        onSendChatMessage={(message, mode) => networkSystemRef.current?.sendChatMessage(message, mode)}
        onDisconnect={handleDisconnect}
        showGameMenu={showGameMenu}
      />
    </div>
  )
}

export default App;
