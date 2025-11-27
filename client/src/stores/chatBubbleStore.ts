import { create } from 'zustand';

export interface ChatBubble {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  position: { x: number; y: number }; // World coordinates
  createdAt: number;
  duration: number;
}

interface ChatBubbleStore {
  bubbles: ChatBubble[];
  addBubble: (bubble: Omit<ChatBubble, 'id' | 'createdAt'>) => void;
  removeBubble: (id: string) => void;
  updateBubblePosition: (playerId: string, position: { x: number; y: number }) => void;
  cleanupExpiredBubbles: () => void;
}

export const useChatBubbleStore = create<ChatBubbleStore>((set, get) => ({
  bubbles: [],

  addBubble: (bubble) => {
    const newBubble: ChatBubble = {
      ...bubble,
      id: `bubble_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: Date.now(),
    };

    console.log(`[CHAT BUBBLE] Adding bubble for ${bubble.playerName}: "${bubble.message}"`);

    set((state) => ({
      bubbles: [...state.bubbles, newBubble],
    }));
  },

  removeBubble: (id) => {
    set((state) => ({
      bubbles: state.bubbles.filter((bubble) => bubble.id !== id),
    }));
  },

  updateBubblePosition: (playerId, position) => {
    set((state) => ({
      bubbles: state.bubbles.map((bubble) =>
        bubble.playerId === playerId ? { ...bubble, position } : bubble
      ),
    }));
  },

  cleanupExpiredBubbles: () => {
    const now = Date.now();
    set((state) => ({
      bubbles: state.bubbles.filter((bubble) => {
        const isExpired = now - bubble.createdAt >= bubble.duration;
        if (isExpired) {
          console.log(`[CHAT BUBBLE] Removing expired bubble for ${bubble.playerName}`);
        }
        return !isExpired;
      }),
    }));
  },
}));

