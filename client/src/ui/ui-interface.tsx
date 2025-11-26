import { useState } from "react"
import { PlayerFrame } from "./player-frame"
import { TargetFrame } from "./target-frame"
import { ActionBar } from "./action-bar"
import { BagPanel } from "./bag-panel"
import { CharacterPanel } from "./character-panel"
import { FPSStats } from "./fps-stats"

export function UIInterface() {
  const [showBags, setShowBags] = useState(false)
  const [showCharacter, setShowCharacter] = useState(false)
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
          onClick={() => setShowBags(!showBags)}
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

      {/* Bottom Right Above Bag - Character Button */}
      <div className="absolute bottom-40 right-4 pointer-events-auto">
        <button
          onClick={() => setShowCharacter(!showCharacter)}
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

      {/* Bottom Center - Action Bar */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
        <ActionBar />
      </div>

      {/* Bag Panel */}
      {showBags && (
        <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-auto">
          <BagPanel onClose={() => setShowBags(false)} />
        </div>
      )}

      {/* Character Panel */}
      {showCharacter && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
          <CharacterPanel onClose={() => setShowCharacter(false)} />
        </div>
      )}
    </div>
  )
}
