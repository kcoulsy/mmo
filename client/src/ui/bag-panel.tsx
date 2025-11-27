"use client"

import { usePlayerStore } from "../stores/playerStore"
import { ITEM_TEMPLATES } from "@shared/items"
import { WindowManager } from "./window-manager"

interface BagItem {
  id: number
  name: string
  icon: string
  quantity: number
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

const rarityColors = {
  common: "border-gray-400",
  uncommon: "border-green-400",
  rare: "border-blue-400",
  epic: "border-purple-400",
  legendary: "border-orange-400",
}

export function BagPanel({ onClose }: { onClose: () => void }) {
  const { inventory } = usePlayerStore()

  // Convert inventory slots to display items
  const items: (BagItem | null)[] = inventory.slots.map((slot, index) => {
    if (!slot) return null

    const template = ITEM_TEMPLATES[slot.itemId]
    if (!template) return null

    return {
      id: index,
      name: template.name,
      icon: template.icon || "❓",
      quantity: slot.quantity,
      rarity: template.rarity,
    }
  })

  return (
    <WindowManager title="Backpack" onClose={onClose} width={384} windowId="bag-panel">
      {/* Bag Grid */}
      <div className="p-3">
        <div className="grid grid-cols-8 gap-1">
          {items.map((item, index) => (
            <div
              key={index}
              className={`w-11 h-11 bg-secondary border-2 rounded relative group cursor-pointer hover:bg-muted transition-colors ${item ? rarityColors[item.rarity] : "border-border"
                }`}
            >
              {item && (
                <>
                  <div className="w-full h-full flex items-center justify-center text-xl">{item.icon}</div>
                  {item.quantity > 1 && (
                    <div className="absolute bottom-0 right-0 bg-black/80 px-1 rounded-tl text-[10px] text-foreground font-bold">
                      {item.quantity}
                    </div>
                  )}

                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-75 pointer-events-none z-10">
                    <div className="bg-card/95 border border-border rounded px-2 py-1 backdrop-blur-sm whitespace-nowrap">
                      <p
                        className={`text-xs font-semibold ${item.rarity === "legendary"
                          ? "text-orange-400"
                          : item.rarity === "epic"
                            ? "text-purple-400"
                            : item.rarity === "rare"
                              ? "text-blue-400"
                              : item.rarity === "uncommon"
                                ? "text-green-400"
                                : "text-foreground"
                          }`}
                      >
                        {item.name}
                      </p>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border flex items-center justify-between">
        <span className="text-muted-foreground text-xs">
          {items.filter(item => item !== null).length} / {inventory.maxSlots} slots
        </span>
        <span className="text-accent text-xs font-semibold">💰 0 Gold</span>
      </div>
    </WindowManager>
  )
}
