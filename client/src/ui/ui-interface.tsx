// No React imports needed - using stores
import { PlayerFrame } from "./player-frame"
import { TargetFrame } from "./target-frame"
import { ActionBar } from "./action-bar"
import { BagPanel } from "./bag-panel"
import { CharacterPanel } from "./character-panel"
import { TradeskillPanel } from "./tradeskill-panel"
import { FPSStats } from "./fps-stats"
import { ChatWindow } from "./chat-window"
import { ExperienceBar } from "./experience-bar"
import { ChatBubble } from "./chat-bubble"
import { GameMenu } from "./game-menu"
import { KeybindSettings } from "./keybind-settings"
import { ChatMode } from "../../../shared/messages"
import { useChatBubbleStore, useKeybindStore, useUIStore } from "../stores"

interface UIInterfaceProps {
  onSendChatMessage?: (message: string, mode: ChatMode) => void
  onDisconnect?: () => void
  onCastSpell?: (spellId: string) => void
  showGameMenu?: boolean
}

export function UIInterface({ onSendChatMessage, onDisconnect, onCastSpell, showGameMenu = false }: UIInterfaceProps) {
  const { bubbles } = useChatBubbleStore()
  const { showKeybindSettings } = useKeybindStore()
  const { showBags, showCharacter, showTradeskills } = useUIStore()
  return (
    <div className="relative h-full w-full pointer-events-none">
      {/* Top Left - Player Frame */}
      <div className="absolute top-4 left-4 pointer-events-auto flex gap-2">
        <PlayerFrame />
        <TargetFrame />
      </div>

      {/* Top Left Below Player - Target Frame */}
      <div className="absolute top-[180px] left-4 pointer-events-auto">

      </div>

      {/* Top Right - Minimap placeholder */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="w-48 h-48 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm">
          <div className="w-full h-full bg-muted/50 rounded-md flex items-center justify-center">
            <span className="text-muted-foreground text-sm">Minimap</span>
          </div>
        </div>
      </div>

      {/* Top Right Below Minimap - FPS Stats */}
      <div className="absolute top-[220px] right-4 pointer-events-auto">
        <FPSStats />
      </div>

      {/* Bottom Right - Bag Button */}
      <div className="absolute bottom-24 right-4 pointer-events-auto">
        <button
          onClick={() => useUIStore.getState().toggleBags()}
          className="w-12 h-12 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm hover:border-primary transition-colors flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </button>
      </div>

      {/* Bottom Right Above Character - Tradeskill Button */}
      <div className="absolute bottom-56 right-4 pointer-events-auto">
        <button
          onClick={() => useUIStore.getState().toggleTradeskills()}
          className="w-12 h-12 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm hover:border-primary transition-colors flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743.058m0 0c-.508.093-1.005.463-1.22.948m0 0c-.106.264-.165.599-.166.984m0 0c.002.406.076.741.22 1.058m0 0c.38.359 1.01.638 1.667.641m0 0c.645-.005 1.248-.27 1.605-.653m0 0c.372-.385.466-1.056.31-1.71m0 0c-.156-.658-.592-1.065-.962-1.325m0 0c-.42-.277-.987-.39-1.57-.29"
            />
          </svg>
        </button>
      </div>

      {/* Bottom Right Above Bag - Character Button */}
      <div className="absolute bottom-40 right-4 pointer-events-auto">
        <button
          onClick={() => useUIStore.getState().toggleCharacter()}
          className="w-12 h-12 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm hover:border-primary transition-colors flex items-center justify-center"
        >
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        </button>
      </div>

      {/* Bottom Left - Chat Window */}
      <div className="absolute bottom-20 left-4 pointer-events-auto">
        <ChatWindow onSendMessage={onSendChatMessage} />
      </div>

      {/* Bottom Center - Action Bar */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-auto flex gap-1 flex-col">
        <ActionBar onCastSpell={onCastSpell} />
        <ExperienceBar />
      </div>

      {/* Bottom Center - Experience Bar */}
      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 pointer-events-auto">

      </div>

      {/* Bag Panel */}
      {showBags && (
        <BagPanel onClose={() => useUIStore.getState().toggleBags()} />
      )}

      {/* Tradeskill Panel */}
      {showTradeskills && (
        <TradeskillPanel onClose={() => useUIStore.getState().toggleTradeskills()} />
      )}

      {/* Character Panel */}
      {showCharacter && (
        <CharacterPanel onClose={() => useUIStore.getState().toggleCharacter()} />
      )}

      {/* Chat Bubbles - positioned over the game world */}
      {bubbles.map((bubble) => (
        <ChatBubble
          key={bubble.id}
          playerName={bubble.playerName}
          message={bubble.message}
          position={{ top: bubble.position.y, left: bubble.position.x }}
          duration={bubble.duration}
        />
      ))}

      {/* Game Menu */}
      {showGameMenu && (
        <>
          <GameMenu onDisconnect={onDisconnect} />
        </>
      )}

      {/* Keybind Settings */}
      {showKeybindSettings && (
        <>
          <KeybindSettings />
        </>
      )}
    </div>
  )
}
