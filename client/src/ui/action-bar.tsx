"use client"

import { useState, useEffect, useRef } from "react"
import { usePlayerStore } from "../stores"
import { SpellTemplate } from "../../../shared/spells"

interface ActionBarProps {
  onCastSpell?: (spellId: string) => void;
}

interface ActionBarSpell {
  spellId: string
  template: SpellTemplate
  cooldownUntil: number
  hotkey: string
}

export function ActionBar({ onCastSpell }: ActionBarProps) {
  const { spellbook } = usePlayerStore()
  const [actionBarSpells, setActionBarSpells] = useState<ActionBarSpell[]>([])
  const networkSystemRef = useRef<any>(null)

  // Update action bar spells when spellbook changes
  useEffect(() => {
    const spells: ActionBarSpell[] = spellbook.spells.slice(0, 10).map((playerSpell, index) => {
      const template = spellbook.availableSpells[playerSpell.spellId]
      return {
        spellId: playerSpell.spellId,
        template: template || {
          id: playerSpell.spellId,
          name: "Unknown Spell",
          description: "Spell data not loaded",
          icon: "❓",
          type: "instant",
          targetType: "self",
          castTime: 0,
          manaCost: 0,
          cooldown: 0,
          range: 0,
          requiresTarget: false,
          canTargetSelf: true,
          canTargetAllies: false,
          canTargetEnemies: false,
          levelRequired: 1,
          effects: [],
        },
        cooldownUntil: playerSpell.cooldownUntil,
        hotkey: (index + 1).toString(), // 1-9, then 0 for 10th spell
      }
    })

    setActionBarSpells(spells)
  }, [spellbook])

  // Get network system reference (this will be passed down from parent)
  useEffect(() => {
    // Import network system dynamically to avoid circular imports
    import("../net/networkSystem").then(({ NetworkSystem }) => {
      // This would need to be passed down from the parent component
      // For now, we'll handle this differently
    })
  }, [])

  const handleSpellClick = (spellId: string) => {
    if (onCastSpell) {
      onCastSpell(spellId)
    } else {
      // Fallback: try to cast directly (would need network system access)
      console.log("Casting spell:", spellId)
    }
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      const key = event.key
      if (key >= '1' && key <= '9') {
        const spellIndex = parseInt(key) - 1
        if (actionBarSpells[spellIndex] && !isOnCooldown(actionBarSpells[spellIndex].cooldownUntil)) {
          handleSpellClick(actionBarSpells[spellIndex].spellId)
        }
      } else if (key === '0') {
        const spellIndex = 9 // 0 key for 10th spell
        if (actionBarSpells[spellIndex] && !isOnCooldown(actionBarSpells[spellIndex].cooldownUntil)) {
          handleSpellClick(actionBarSpells[spellIndex].spellId)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [actionBarSpells, onCastSpell])

  const getCooldownRemaining = (cooldownUntil: number) => {
    const remaining = Math.max(0, cooldownUntil - Date.now())
    return Math.ceil(remaining / 1000) // Convert to seconds
  }

  const isOnCooldown = (cooldownUntil: number) => {
    return cooldownUntil > Date.now()
  }

  return (
    <div className="flex gap-2">
      {actionBarSpells.map((spell) => {
        const cooldownRemaining = getCooldownRemaining(spell.cooldownUntil)
        const onCooldown = isOnCooldown(spell.cooldownUntil)

        return (
          <div key={spell.spellId} className="relative group">
            <button
              className="w-14 h-14 bg-card/90 border-2 border-border rounded-lg backdrop-blur-sm hover:border-primary transition-all hover:scale-105 active:scale-95 flex items-center justify-center text-2xl relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={onCooldown}
              onClick={() => handleSpellClick(spell.spellId)}
            >
              {spell.template.icon || "❓"}
              {onCooldown && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-foreground text-xs font-bold">{cooldownRemaining}</span>
                </div>
              )}
            </button>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-secondary border border-border rounded flex items-center justify-center">
              <span className="text-foreground text-[10px] font-bold">{spell.hotkey}</span>
            </div>

            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none">
              <div className="bg-card/95 border border-border rounded px-2 py-1 backdrop-blur-sm whitespace-nowrap">
                <p className="text-foreground text-xs font-semibold">{spell.template.name}</p>
                <p className="text-muted-foreground text-[10px]">{spell.template.description}</p>
                {spell.template.cooldown > 0 && (
                  <p className="text-muted-foreground text-[10px]">
                    {Math.ceil(spell.template.cooldown / 1000)}s cooldown
                  </p>
                )}
                {spell.template.manaCost > 0 && (
                  <p className="text-muted-foreground text-[10px]">
                    {spell.template.manaCost} mana
                  </p>
                )}
                {onCooldown && (
                  <p className="text-red-400 text-[10px]">
                    {cooldownRemaining}s remaining
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ActionBar