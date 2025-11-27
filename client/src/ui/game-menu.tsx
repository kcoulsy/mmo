import { useKeybindStore } from '../stores';

interface GameMenuProps {
  onDisconnect?: () => void;
}

export function GameMenu({ onDisconnect }: GameMenuProps) {
  const { closeGameMenu, openKeybindSettings } = useKeybindStore();

  const handleKeybinds = () => {
    closeGameMenu();
    openKeybindSettings();
  };

  const handleExitGame = () => {
    closeGameMenu();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
      <div className="bg-card/95 border-2 border-border rounded-lg shadow-2xl p-8 max-w-sm w-full mx-4 pointer-events-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">Game Menu</h2>
          <p className="text-muted-foreground text-sm">What would you like to do?</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleKeybinds}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Keybinds
          </button>

          <button
            onClick={handleExitGame}
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Exit Game
          </button>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={closeGameMenu}
            className="text-muted-foreground hover:text-foreground text-sm underline transition-colors"
          >
            Cancel (ESC)
          </button>
        </div>
      </div>
    </div>
  );
}
