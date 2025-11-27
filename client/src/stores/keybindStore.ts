import { create } from "zustand";

export interface KeybindAction {
  id: string;
  name: string;
  description: string;
  category: "movement" | "ui" | "actions" | "menu";
  defaultKey?: string;
}

export interface KeybindMapping {
  [actionId: string]: string; // actionId -> key code
}

export interface KeybindState {
  // Available actions
  actions: KeybindAction[];

  // Current key mappings
  mappings: KeybindMapping;

  // UI state
  showGameMenu: boolean;
  showKeybindSettings: boolean;

  // Key binding state
  isBinding: boolean;
  bindingActionId: string | null;
}

interface KeybindStore extends KeybindState {
  // Menu controls
  toggleGameMenu: () => void;
  closeGameMenu: () => void;
  openKeybindSettings: () => void;
  closeKeybindSettings: () => void;

  // Key binding
  startBinding: (actionId: string) => void;
  cancelBinding: () => void;
  setKeybind: (actionId: string, keyCode: string) => void;
  resetToDefaults: () => void;

  // Get key for action
  getKeyForAction: (actionId: string) => string | undefined;

  // Check if key is bound
  isKeyBound: (keyCode: string) => boolean;
  getActionForKey: (keyCode: string) => string | undefined;
}

const DEFAULT_ACTIONS: KeybindAction[] = [
  // Movement
  {
    id: "move_up",
    name: "Move Up",
    description: "Move character up",
    category: "movement",
    defaultKey: "KeyW",
  },
  {
    id: "move_down",
    name: "Move Down",
    description: "Move character down",
    category: "movement",
    defaultKey: "KeyS",
  },
  {
    id: "move_left",
    name: "Move Left",
    description: "Move character left",
    category: "movement",
    defaultKey: "KeyA",
  },
  {
    id: "move_right",
    name: "Move Right",
    description: "Move character right",
    category: "movement",
    defaultKey: "KeyD",
  },

  // UI
  {
    id: "toggle_bag",
    name: "Toggle Bag",
    description: "Open/close bag inventory",
    category: "ui",
    defaultKey: "KeyB",
  },
  {
    id: "toggle_inventory",
    name: "Toggle Inventory",
    description: "Open/close character inventory",
    category: "ui",
    defaultKey: "KeyI",
  },
  {
    id: "toggle_skills",
    name: "Toggle Skills",
    description: "Open/close skills menu",
    category: "ui",
    defaultKey: "KeyK",
  },
  {
    id: "toggle_character",
    name: "Toggle Character",
    description: "Open/close character panel",
    category: "ui",
    defaultKey: "KeyC",
  },
  {
    id: "toggle_game_menu",
    name: "Game Menu",
    description: "Open game menu",
    category: "menu",
    defaultKey: "Escape",
  },
];

const createDefaultMappings = (): KeybindMapping => {
  const mappings: KeybindMapping = {};
  DEFAULT_ACTIONS.forEach((action) => {
    if (action.defaultKey) {
      mappings[action.id] = action.defaultKey;
    }
  });
  return mappings;
};

export const useKeybindStore = create<KeybindStore>((set, get) => ({
  // Initial state
  actions: DEFAULT_ACTIONS,
  mappings: createDefaultMappings(),
  showGameMenu: false,
  showKeybindSettings: false,
  isBinding: false,
  bindingActionId: null,

  // Menu controls
  toggleGameMenu: () => {
    set((state) => {
      const newShowGameMenu = !state.showGameMenu;
      return { showGameMenu: newShowGameMenu };
    });
  },
  closeGameMenu: () => {
    set({ showGameMenu: false });
  },
  openKeybindSettings: () => {
    set({ showKeybindSettings: true });
  },
  closeKeybindSettings: () => {
    set({ showKeybindSettings: false });
  },

  // Key binding
  startBinding: (actionId: string) =>
    set({
      isBinding: true,
      bindingActionId: actionId,
    }),

  cancelBinding: () =>
    set({
      isBinding: false,
      bindingActionId: null,
    }),

  setKeybind: (actionId: string, keyCode: string) =>
    set((state) => {
      // Remove this key from any other action first
      const newMappings = { ...state.mappings };
      Object.keys(newMappings).forEach((key) => {
        if (newMappings[key] === keyCode) {
          delete newMappings[key];
        }
      });

      // Set the new keybind
      newMappings[actionId] = keyCode;

      return {
        mappings: newMappings,
        isBinding: false,
        bindingActionId: null,
      };
    }),

  resetToDefaults: () =>
    set({
      mappings: createDefaultMappings(),
      showGameMenu: false,
      showKeybindSettings: false,
      isBinding: false,
      bindingActionId: null,
    }),

  // Get key for action
  getKeyForAction: (actionId: string) => {
    return get().mappings[actionId];
  },

  // Check if key is bound
  isKeyBound: (keyCode: string) => {
    return Object.values(get().mappings).includes(keyCode);
  },

  // Get action for key
  getActionForKey: (keyCode: string) => {
    const mappings = get().mappings;
    return Object.keys(mappings).find(
      (actionId) => mappings[actionId] === keyCode
    );
  },
}));
