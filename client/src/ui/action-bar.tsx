"use client"

import { useState } from "react"

interface Spell {
  id: number
  name: string
  icon: string
  cooldown: number
  currentCooldown: number
  hotkey: string
}

export function ActionBar() {
  const [spells] = useState<Spell[]>([
    { id: 1, name: "Backstab", icon: "🗡️", cooldown: 0, currentCooldown: 0, hotkey: "1" },
    { id: 2, name: "Eviscerate", icon: "⚔️", cooldown: 8, currentCooldown: 0, hotkey: "2" },
    { id: 3, name: "Shadow Step", icon: "👤", cooldown: 12, currentCooldown: 0, hotkey: "3" },
    { id: 4, name: "Vanish", icon: "💨", cooldown: 30, currentCooldown: 0, hotkey: "4" },
    { id: 5, name: "Kick", icon: "🦵", cooldown: 15, currentCooldown: 0, hotkey: "5" },
    { id: 6, name: "Cloak", icon: "🧥", cooldown: 20, currentCooldown: 0, hotkey: "6" },
    { id: 7, name: "Sprint", icon: "💨", cooldown: 25, currentCooldown: 0, hotkey: "7" },
    { id: 8, name: "Blind", icon: "👁️", cooldown: 18, currentCooldown: 0, hotkey: "8" },
    { id: 9, name: "Poison", icon: "☠️", cooldown: 0, currentCooldown: 0, hotkey: "9" },
    { id: 10, name: "Stealth", icon: "🌑", cooldown: 6, currentCooldown: 0, hotkey: "0" },
  ])

  return (
    <div className="flex gap-2">
      {spells.map((spell) => (
        <div key={spell.id} className="relative group">
          <button className="w-14 h-14 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm hover:border-primary transition-all hover:scale-105 active:scale-95 flex items-center justify-center text-2xl relative overflow-hidden">
            {spell.icon}
            {spell.currentCooldown > 0 && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-foreground text-xs font-bold">{spell.currentCooldown}</span>
              </div>
            )}
          </button>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary border border-border rounded flex items-center justify-center">
            <span className="text-foreground text-[10px] font-bold">{spell.hotkey}</span>
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="bg-card/95 border border-border rounded px-2 py-1 backdrop-blur-sm whitespace-nowrap">
              <p className="text-foreground text-xs font-semibold">{spell.name}</p>
              {spell.cooldown > 0 && <p className="text-muted-foreground text-[10px]">{spell.cooldown}s cooldown</p>}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ActionBar