"use client"

import { useState } from "react"

export function PlayerFrame() {
  const [health, setHealth] = useState(85)
  const [mana, setMana] = useState(60)
  const maxHealth = 100
  const maxMana = 100

  return (
    <div className="w-80 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm p-3">
      {/* Player Info Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
          <svg className="w-7 h-7 text-primary" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-semibold text-sm">Shadowblade</h3>
            <span className="text-accent text-xs font-bold">85</span>
          </div>
          <p className="text-muted-foreground text-xs">Rogue • Level 85</p>
        </div>
      </div>

      {/* Health Bar */}
      <div className="mb-2">
        <div className="relative h-6 bg-secondary rounded-md overflow-hidden border border-border">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-health to-green-400 transition-all duration-300"
            style={{ width: `${(health / maxHealth) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-foreground text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {health} / {maxHealth}
            </span>
          </div>
        </div>
      </div>

      {/* Mana Bar */}
      <div>
        <div className="relative h-5 bg-secondary rounded-md overflow-hidden border border-border">
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-mana to-blue-400 transition-all duration-300"
            style={{ width: `${(mana / maxMana) * 100}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-foreground text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {mana} / {maxMana}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
