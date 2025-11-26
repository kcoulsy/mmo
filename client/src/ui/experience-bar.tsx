"use client"

import { useState } from "react"

export function ExperienceBar() {
  const [currentXP, setCurrentXP] = useState(2450)
  const [levelXP, setLevelXP] = useState(3000)
  const currentLevel = 85

  // Calculate XP needed for next level
  const xpToNextLevel = levelXP - currentXP
  const xpPercentage = (currentXP / levelXP) * 100

  return (
    <div className="relative h-3 bg-secondary rounded-md overflow-hidden border border-border">
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-purple-400 transition-all duration-500"
        style={{ width: `${xpPercentage}%` }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-foreground text-xs font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
          Level {currentLevel} • {currentXP.toLocaleString()} / {levelXP.toLocaleString()} XP • {xpToNextLevel.toLocaleString()} to next
        </span>
      </div>
    </div>
  )
}
