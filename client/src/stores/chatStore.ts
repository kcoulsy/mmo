import { create } from 'zustand';
import { ChatMessage as SharedChatMessage } from '../../../shared/messages';

export interface ChatMessage extends Omit<SharedChatMessage, 'timestamp'> {
  timestamp: Date;
}

interface ChatStore {
  messages: ChatMessage[];
  addMessage: (message: SharedChatMessage) => void;
  clearMessages: () => void;
}

export const useChatStore = create<ChatStore>((set) => ({
  messages: [],
  addMessage: (message: SharedChatMessage) => {
    const chatMessage: ChatMessage = {
      ...message,
      timestamp: new Date(message.timestamp),
    };
    console.log(`[CHAT STORE] Adding message: "${chatMessage.message}" from ${chatMessage.playerName} (mode: ${chatMessage.mode})`);
    set((state) => ({
      messages: [...state.messages, chatMessage].slice(-100), // Keep last 100 messages
    }));
  },
  clearMessages: () => set({ messages: [] }),
}));
