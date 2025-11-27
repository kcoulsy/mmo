import { useState, useEffect } from 'react';
import { useGameStore } from '../stores';

interface LoginScreenProps {
  onLogin: (playerName: string) => void;
  onReconnect: () => void;
}

export function LoginScreen({ onLogin, onReconnect }: LoginScreenProps) {
  const [playerName, setPlayerName] = useState('');
  const { connectionStatus, isReconnecting, playerName: storedPlayerName } = useGameStore();

  // Initialize player name from store if reconnecting
  useEffect(() => {
    if (isReconnecting && storedPlayerName) {
      setPlayerName(storedPlayerName);
    }
  }, [isReconnecting, storedPlayerName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onLogin(playerName.trim());
    }
  };

  const handleReconnect = () => {
    onReconnect();
  };

  const getStatusMessage = () => {
    switch (connectionStatus) {
      case 'connecting':
        return isReconnecting ? 'Reconnecting...' : 'Connecting...';
      case 'error':
        return 'Connection failed. Please try again.';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-card border border-border rounded-lg p-8 shadow-lg max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Ironwild</h1>
          <p className="text-muted-foreground">Enter the world</p>
        </div>

        {isReconnecting ? (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Connection lost. Welcome back, {storedPlayerName}!
              </p>
            </div>

            <button
              onClick={handleReconnect}
              disabled={connectionStatus === 'connecting'}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium py-3 px-4 rounded-md transition-colors"
            >
              {connectionStatus === 'connecting' ? 'Reconnecting...' : 'Reconnect'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="playerName" className="block text-sm font-medium text-foreground mb-2">
                Character Name
              </label>
              <input
                id="playerName"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                maxLength={20}
                autoFocus
                disabled={connectionStatus === 'connecting'}
              />
            </div>

            <button
              type="submit"
              disabled={!playerName.trim() || connectionStatus === 'connecting'}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground text-primary-foreground font-medium py-3 px-4 rounded-md transition-colors"
            >
              {connectionStatus === 'connecting' ? 'Connecting...' : 'Enter World'}
            </button>
          </form>
        )}

        {getStatusMessage() && (
          <div className="mt-4 text-center">
            <p className={`text-sm ${connectionStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'}`}>
              {getStatusMessage()}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
