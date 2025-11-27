"use client"

import { usePlayerStore } from "../stores/playerStore"

export function TargetFrame() {
  const { target } = usePlayerStore()

  console.log(`[TARGET_FRAME] Render - target:`, target);

  if (!target) return null

  const health = target.hp || 0
  const maxHealth = target.maxHp || 100

  return (
    <div className="w-80 bg-card/90 border-2 border-red-500 rounded-lg backdrop-blur-sm p-3">
      {/* Target Info Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-semibold text-sm">{target.name}</h3>
            <span className="text-red-500 text-xs font-bold">{target.level || 1}</span>
          </div>
          <p className="text-muted-foreground text-xs capitalize">{target.type} • Level {target.level || 1}</p>
        </div>
      </div>

      {/* Health Bar */}
      <div>
        <div className="relative h-6 bg-secondary rounded-md overflow-hidden border border-border">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300"
            style={{ width: `${(health / maxHealth) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-foreground text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {health} / {maxHealth}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}