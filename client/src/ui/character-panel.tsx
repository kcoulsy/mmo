"use client"

import { X } from "lucide-react"

interface EquipmentSlot {
  slot: string
  item: string | null
  icon: string
  rarity?: "common" | "uncommon" | "rare" | "epic" | "legendary"
}

const rarityColors = {
  common: "border-gray-400",
  uncommon: "border-green-400",
  rare: "border-blue-400",
  epic: "border-purple-400",
  legendary: "border-orange-400",
}

export function CharacterPanel({ onClose }: { onClose: () => void }) {
  const equipment: EquipmentSlot[] = [
    { slot: "Head", item: "Shadow Hood", icon: "🎩", rarity: "epic" },
    { slot: "Neck", item: "Amulet of Stealth", icon: "📿", rarity: "rare" },
    { slot: "Shoulders", item: "Dark Pauldrons", icon: "🦾", rarity: "rare" },
    { slot: "Back", item: "Cloak of Shadows", icon: "🧥", rarity: "epic" },
    { slot: "Chest", item: "Leather Vest", icon: "👔", rarity: "rare" },
    { slot: "Wrist", item: "Bracers of Agility", icon: "⌚", rarity: "uncommon" },
    { slot: "Hands", item: "Assassin Gloves", icon: "🧤", rarity: "epic" },
    { slot: "Waist", item: "Belt of Knives", icon: "🔗", rarity: "rare" },
    { slot: "Legs", item: "Shadow Leggings", icon: "👖", rarity: "rare" },
    { slot: "Feet", item: "Silent Boots", icon: "👢", rarity: "epic" },
    { slot: "Ring 1", item: "Ring of Haste", icon: "💍", rarity: "rare" },
    { slot: "Ring 2", item: "Ring of Power", icon: "💍", rarity: "epic" },
    { slot: "Trinket 1", item: "Lucky Coin", icon: "🪙", rarity: "legendary" },
    { slot: "Trinket 2", item: null, icon: "✨", rarity: undefined },
    { slot: "Main Hand", item: "Shadowstrike", icon: "🗡️", rarity: "epic" },
    { slot: "Off Hand", item: "Venomfang", icon: "🔪", rarity: "rare" },
  ]

  const stats = [
    { name: "Strength", value: 245 },
    { name: "Agility", value: 892 },
    { name: "Stamina", value: 456 },
    { name: "Critical Strike", value: "38.5%" },
    { name: "Haste", value: "22.3%" },
    { name: "Mastery", value: "45.8%" },
  ]

  return (
    <div className="w-[600px] bg-card/95 border-2 border-border rounded-lg backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-foreground font-semibold text-lg">Shadowblade</h2>
          <p className="text-muted-foreground text-sm">Level 85 Rogue</p>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 flex gap-6">
        {/* Left Side - Character Model */}
        <div className="flex-shrink-0">
          <div className="w-48 h-64 bg-secondary/50 border-2 border-border rounded-lg flex items-center justify-center">
            <div className="text-6xl">🥷</div>
          </div>
          <div className="mt-3 text-center">
            <div className="text-accent text-sm font-semibold">Item Level: 425</div>
          </div>
        </div>

        {/* Middle - Equipment Slots */}
        <div className="flex-1">
          <h3 className="text-foreground font-semibold mb-3 text-sm">Equipment</h3>
          <div className="grid grid-cols-2 gap-2">
            {equipment.map((slot, index) => (
              <div
                key={index}
                className={`flex items-center gap-2 p-2 bg-secondary/50 border-2 rounded group cursor-pointer hover:bg-muted transition-colors ${slot.item && slot.rarity ? rarityColors[slot.rarity] : "border-border"
                  }`}
              >
                <div className="w-8 h-8 bg-card border border-border rounded flex items-center justify-center text-lg flex-shrink-0">
                  {slot.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-muted-foreground text-[10px]">{slot.slot}</div>
                  <div
                    className={`text-xs font-medium truncate ${slot.item
                        ? slot.rarity === "legendary"
                          ? "text-orange-400"
                          : slot.rarity === "epic"
                            ? "text-purple-400"
                            : slot.rarity === "rare"
                              ? "text-blue-400"
                              : slot.rarity === "uncommon"
                                ? "text-green-400"
                                : "text-foreground"
                        : "text-muted-foreground"
                      }`}
                  >
                    {slot.item || "Empty"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Stats */}
        <div className="w-40 flex-shrink-0">
          <h3 className="text-foreground font-semibold mb-3 text-sm">Stats</h3>
          <div className="space-y-3">
            {stats.map((stat, index) => (
              <div key={index}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-muted-foreground text-xs">{stat.name}</span>
                  <span className="text-foreground text-xs font-semibold">{stat.value}</span>
                </div>
                {typeof stat.value === "number" && (
                  <div className="h-1 bg-secondary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${Math.min((stat.value / 1000) * 100, 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
