import { create } from 'zustand';

export interface OtherPlayer {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  stats: {
    hp: number;
    maxHp: number;
    level: number;
  };
  isOnline: boolean;
}

export interface GameState {
  // Connection
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  lastPing: number;

  // Players
  otherPlayers: Record<string, OtherPlayer>;
  playerCount: number;

  // Game world
  currentMap: string;
  mapLoaded: boolean;

  // Performance
  fps: number;
  latency: number;

  // Game settings
  soundEnabled: boolean;
  musicEnabled: boolean;
  volume: number;
}

interface GameStore extends GameState {
  // Connection
  setConnected: (connected: boolean) => void;
  setConnectionStatus: (status: GameState['connectionStatus']) => void;
  updatePing: (ping: number) => void;

  // Players
  addPlayer: (player: OtherPlayer) => void;
  updatePlayer: (id: string, updates: Partial<OtherPlayer>) => void;
  removePlayer: (id: string) => void;
  setPlayerCount: (count: number) => void;

  // Game world
  setCurrentMap: (map: string) => void;
  setMapLoaded: (loaded: boolean) => void;

  // Performance
  updateFPS: (fps: number) => void;
  updateLatency: (latency: number) => void;

  // Settings
  setSoundEnabled: (enabled: boolean) => void;
  setMusicEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  // Initial state
  isConnected: false,
  connectionStatus: 'disconnected',
  lastPing: 0,

  otherPlayers: {},
  playerCount: 0,

  currentMap: 'starting_area',
  mapLoaded: false,

  fps: 0,
  latency: 0,

  soundEnabled: true,
  musicEnabled: true,
  volume: 0.7,

  // Connection
  setConnected: (isConnected) => set({ isConnected }),
  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),
  updatePing: (lastPing) => set({ lastPing }),

  // Players
  addPlayer: (player) => set((state) => ({
    otherPlayers: { ...state.otherPlayers, [player.id]: player },
    playerCount: Object.keys(state.otherPlayers).length + 1
  })),

  updatePlayer: (id, updates) => set((state) => ({
    otherPlayers: {
      ...state.otherPlayers,
      [id]: { ...state.otherPlayers[id], ...updates }
    }
  })),

  removePlayer: (id) => set((state) => {
    const newPlayers = { ...state.otherPlayers };
    delete newPlayers[id];
    return {
      otherPlayers: newPlayers,
      playerCount: Object.keys(newPlayers).length
    };
  }),

  setPlayerCount: (playerCount) => set({ playerCount }),

  // Game world
  setCurrentMap: (currentMap) => set({ currentMap }),
  setMapLoaded: (mapLoaded) => set({ mapLoaded }),

  // Performance
  updateFPS: (fps) => set({ fps }),
  updateLatency: (latency) => set({ latency }),

  // Settings
  setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
  setMusicEnabled: (musicEnabled) => set({ musicEnabled }),
  setVolume: (volume) => set({ volume }),
}));
