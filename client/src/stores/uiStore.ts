import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: number;
  type: 'system' | 'player' | 'party' | 'guild' | 'whisper';
}

export interface InventoryItem {
  id: string;
  name: string;
  icon: string;
  quantity: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  type: 'weapon' | 'armor' | 'consumable' | 'material';
  description: string;
}

export interface UIState {
  // Window visibility
  showChat: boolean;
  showInventory: boolean;
  showCharacter: boolean;
  showSettings: boolean;
  showMinimap: boolean;
  showBags: boolean;
  showTradeskills: boolean;

  // Chat
  chatMessages: ChatMessage[];
  currentChannel: 'general' | 'party' | 'guild' | 'whisper';
  chatInput: string;

  // Inventory
  inventory: InventoryItem[];
  selectedItem: InventoryItem | null;

  // UI settings
  showHealthBars: boolean;
  showDamageNumbers: boolean;
  uiScale: number;
}

interface UIStore extends UIState {
  // Window controls
  toggleChat: () => void;
  toggleInventory: () => void;
  toggleCharacter: () => void;
  toggleSettings: () => void;
  toggleMinimap: () => void;
  toggleBags: () => void;
  toggleTradeskills: () => void;

  // Chat functions
  addChatMessage: (message: Omit<ChatMessage, 'id'>) => void;
  setChatInput: (input: string) => void;
  sendChatMessage: () => void;
  setCurrentChannel: (channel: UIState['currentChannel']) => void;
  clearChat: () => void;

  // Inventory functions
  addItem: (item: InventoryItem) => void;
  removeItem: (itemId: string) => void;
  selectItem: (item: InventoryItem | null) => void;

  // UI settings
  setShowHealthBars: (show: boolean) => void;
  setShowDamageNumbers: (show: boolean) => void;
  setUIScale: (scale: number) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // Initial state
  showChat: true,
  showInventory: false,
  showCharacter: false,
  showSettings: false,
  showMinimap: true,
  showBags: false,
  showTradeskills: false,

  chatMessages: [
    {
      id: '1',
      sender: 'System',
      message: 'Welcome to Ironwild!',
      timestamp: Date.now(),
      type: 'system'
    }
  ],
  currentChannel: 'general',
  chatInput: '',

  inventory: [
    {
      id: 'health_potion_1',
      name: 'Health Potion',
      icon: '🧪',
      quantity: 5,
      rarity: 'common',
      type: 'consumable',
      description: 'Restores 50 HP when consumed.'
    },
    {
      id: 'iron_sword',
      name: 'Iron Sword',
      icon: '⚔️',
      quantity: 1,
      rarity: 'uncommon',
      type: 'weapon',
      description: 'A sturdy iron sword. +5 Attack'
    },
    {
      id: 'leather_armor',
      name: 'Leather Armor',
      icon: '🛡️',
      quantity: 1,
      rarity: 'common',
      type: 'armor',
      description: 'Basic leather protection. +2 Defense'
    },
    {
      id: 'gold_coins',
      name: 'Gold Coins',
      icon: '💰',
      quantity: 150,
      rarity: 'common',
      type: 'material',
      description: 'Shiny gold coins used for trading.'
    }
  ],
  selectedItem: null,

  showHealthBars: true,
  showDamageNumbers: true,
  uiScale: 1.0,

  // Window controls
  toggleChat: () => set((state) => ({ showChat: !state.showChat })),
  toggleInventory: () => set((state) => ({ showInventory: !state.showInventory })),
  toggleCharacter: () => set((state) => ({ showCharacter: !state.showCharacter })),
  toggleSettings: () => set((state) => ({ showSettings: !state.showSettings })),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
  toggleBags: () => set((state) => ({ showBags: !state.showBags })),
  toggleTradeskills: () => set((state) => ({ showTradeskills: !state.showTradeskills })),

  // Chat functions
  addChatMessage: (message) => set((state) => ({
    chatMessages: [...state.chatMessages, {
      ...message,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9)
    }]
  })),

  setChatInput: (chatInput) => set({ chatInput }),

  sendChatMessage: () => {
    const { chatInput, currentChannel } = get();
    if (chatInput.trim()) {
      get().addChatMessage({
        sender: 'You',
        message: chatInput,
        timestamp: Date.now(),
        type: currentChannel === 'general' ? 'player' : currentChannel
      });
      set({ chatInput: '' });
    }
  },

  setCurrentChannel: (currentChannel) => set({ currentChannel }),

  clearChat: () => set({ chatMessages: [] }),

  // Inventory functions
  addItem: (item) => set((state) => ({
    inventory: [...state.inventory, item]
  })),

  removeItem: (itemId) => set((state) => ({
    inventory: state.inventory.filter(item => item.id !== itemId),
    selectedItem: state.selectedItem?.id === itemId ? null : state.selectedItem
  })),

  selectItem: (selectedItem) => set({ selectedItem }),

  // UI settings
  setShowHealthBars: (showHealthBars) => set({ showHealthBars }),
  setShowDamageNumbers: (showDamageNumbers) => set({ showDamageNumbers }),
  setUIScale: (uiScale) => set({ uiScale }),
}));
