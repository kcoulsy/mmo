import { useState, useEffect } from 'react';
import { useKeybindStore } from '../stores';

interface KeybindSettingsProps {
  onClose?: () => void;
}

export function KeybindSettings({ onClose }: KeybindSettingsProps) {
  const {
    actions,
    mappings,
    isBinding,
    bindingActionId,
    startBinding,
    cancelBinding,
    setKeybind,
    resetToDefaults,
    closeKeybindSettings,
    getKeyForAction
  } = useKeybindStore();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Group actions by category
  const categories = ['all', ...Array.from(new Set(actions.map(action => action.category)))];

  const filteredActions = selectedCategory === 'all'
    ? actions
    : actions.filter(action => action.category === selectedCategory);

  // Handle key binding
  useEffect(() => {
    if (!isBinding) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't bind modifier keys alone
      if (['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) {
        return;
      }

      const keyCode = e.code;
      if (bindingActionId) {
        setKeybind(bindingActionId, keyCode);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      // Allow ESC to cancel binding
      if (e.code === 'Escape') {
        cancelBinding();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [isBinding, bindingActionId, setKeybind, cancelBinding]);

  const formatKeyName = (keyCode: string): string => {
    // Convert key codes to more readable names
    const keyMap: Record<string, string> = {
      'KeyW': 'W', 'KeyA': 'A', 'KeyS': 'S', 'KeyD': 'D',
      'KeyB': 'B', 'KeyI': 'I', 'KeyK': 'K', 'KeyC': 'C',
      'Escape': 'ESC',
      'Space': 'Space',
      'Enter': 'Enter',
      'Backspace': 'Backspace',
      'Tab': 'Tab',
      'ArrowUp': '↑', 'ArrowDown': '↓', 'ArrowLeft': '←', 'ArrowRight': '→'
    };

    return keyMap[keyCode] || keyCode.replace('Key', '').replace('Digit', '');
  };

  const handleClose = () => {
    closeKeybindSettings();
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 pointer-events-auto">
      <div className="bg-card/95 border-2 border-border rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-2xl font-bold text-foreground">Keybind Settings</h2>
          <button
            onClick={handleClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Category Filter */}
        <div className="p-6 border-b border-border">
          <div className="flex gap-2 flex-wrap">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${selectedCategory === category
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  }`}
              >
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Keybind List */}
        <div className="flex-1 overflow-y-auto p-6 max-h-96">
          <div className="space-y-4">
            {filteredActions.map(action => {
              const currentKey = getKeyForAction(action.id);
              const isCurrentlyBinding = isBinding && bindingActionId === action.id;

              return (
                <div key={action.id} className="flex items-center justify-between py-2">
                  <div className="flex-1">
                    <div className="font-medium text-foreground">{action.name}</div>
                    <div className="text-sm text-muted-foreground">{action.description}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-md text-sm font-mono min-w-[60px] text-center ${isCurrentlyBinding
                      ? 'bg-primary text-primary-foreground animate-pulse'
                      : 'bg-muted text-muted-foreground'
                      }`}>
                      {isCurrentlyBinding ? 'Press key...' : currentKey ? formatKeyName(currentKey) : 'Unbound'}
                    </div>

                    <button
                      onClick={() => {
                        startBinding(action.id);
                      }}
                      disabled={isBinding}
                      className="px-3 py-1 bg-secondary hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed text-secondary-foreground text-sm rounded-md transition-colors"
                    >
                      {isCurrentlyBinding && bindingActionId === action.id ? 'Binding...' : 'Change'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={() => {
              resetToDefaults();
            }}
            className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground text-sm rounded-md transition-colors"
          >
            Reset to Defaults
          </button>

          <div className="flex gap-2">
            {isBinding && (
              <button
                onClick={() => {
                  cancelBinding();
                }}
                className="px-4 py-2 bg-muted hover:bg-muted/80 text-muted-foreground text-sm rounded-md transition-colors"
              >
                Cancel Binding
              </button>
            )}

            <button
              onClick={handleClose}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
