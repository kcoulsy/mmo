"use client"

import { X } from "lucide-react"

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
  const items: (BagItem | null)[] = [
    { id: 1, name: "Health Potion", icon: "🧪", quantity: 15, rarity: "common" },
    { id: 2, name: "Mana Potion", icon: "💙", quantity: 12, rarity: "common" },
    { id: 3, name: "Shadowstrike Dagger", icon: "🗡️", quantity: 1, rarity: "epic" },
    { id: 4, name: "Leather Armor", icon: "🛡️", quantity: 1, rarity: "rare" },
    { id: 5, name: "Gold Coins", icon: "💰", quantity: 2847, rarity: "common" },
    { id: 6, name: "Lockpick", icon: "🔓", quantity: 28, rarity: "common" },
    { id: 7, name: "Poison Vial", icon: "☠️", quantity: 8, rarity: "uncommon" },
    { id: 8, name: "Smoke Bomb", icon: "💣", quantity: 5, rarity: "uncommon" },
    { id: 9, name: "Ancient Rune", icon: "📜", quantity: 1, rarity: "legendary" },
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
    null,
  ]

  return (
    <div className="w-96 bg-card/95 border-2 border-border rounded-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border">
        <h2 className="text-foreground font-semibold">Backpack</h2>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

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
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
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
        <span className="text-muted-foreground text-xs">9 / 32 slots</span>
        <span className="text-accent text-xs font-semibold">💰 2,847 Gold</span>
      </div>
    </div>
  )
}
