"use client"

import { ChevronLeft } from "lucide-react"
import { useState } from "react"
import { usePlayerStore } from "../stores"
import { Tradeskill } from "../stores/playerStore"
import { WindowManager } from "./window-manager"

interface TradeskillPanelProps {
  onClose: () => void
}

export function TradeskillPanel({ onClose }: TradeskillPanelProps) {
  const { tradeskills } = usePlayerStore()
  const [selectedSkill, setSelectedSkill] = useState<Tradeskill | null>(null)

  if (selectedSkill) {
    return (
      <WindowManager title={selectedSkill.name} onClose={onClose} width={320} windowId={`tradeskill-${selectedSkill.name}`}>
        <div className="p-3">
          <button
            onClick={() => setSelectedSkill(null)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors mb-3 text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Tradeskills
          </button>
          <SkillDetailView skill={selectedSkill} />
        </div>
      </WindowManager>
    )
  }

  return (
    <WindowManager title="Tradeskills" onClose={onClose} width={320} windowId="tradeskill-panel">
      <div className="p-3 space-y-3">
        {tradeskills.map((skill) => (
          <TradeskillItem key={skill.name} skill={skill} onClick={() => setSelectedSkill(skill)} />
        ))}
      </div>
    </WindowManager>
  )
}

interface TradeskillItemProps {
  skill: Tradeskill
  onClick?: () => void
}

function TradeskillItem({ skill, onClick }: TradeskillItemProps) {
  const experiencePercentage = (skill.experience / skill.experienceToNext) * 100

  return (
    <div
      className="bg-secondary/50 border border-border rounded p-3 cursor-pointer hover:bg-secondary transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="text-2xl">{skill.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-medium text-sm">{skill.name}</h3>
            <span className="text-accent text-sm font-semibold">Level {skill.level}</span>
          </div>
        </div>
      </div>

      {/* Experience Bar */}
      <div className="space-y-1">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${Math.min(experiencePercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{skill.experience} XP</span>
          <span>{skill.experienceToNext} XP</span>
        </div>
      </div>
    </div>
  )
}

interface SkillDetailViewProps {
  skill: Tradeskill
}

function SkillDetailView({ skill }: SkillDetailViewProps) {
  // Placeholder data for different skills
  const getSkillData = (skillName: string) => {
    switch (skillName) {
      case "Mining":
        return {
          description: "Extract minerals and ores from the earth.",
          unlocked: ["Copper Ore", "Tin Ore", "Iron Ore"],
          recipes: ["Copper Bar", "Bronze Bar", "Iron Bar"]
        }
      case "Woodcutting":
        return {
          description: "Harvest wood from trees and process lumber.",
          unlocked: ["Oak Log", "Pine Log", "Maple Log"],
          recipes: ["Oak Planks", "Pine Planks", "Maple Planks"]
        }
      case "Herbalism":
        return {
          description: "Gather herbs and medicinal plants.",
          unlocked: ["Peacebloom", "Silverleaf", "Earthroot"],
          recipes: ["Healing Potion", "Mana Potion", "Antidote"]
        }
      default:
        return {
          description: "Unknown tradeskill.",
          unlocked: [],
          recipes: []
        }
    }
  }

  const skillData = getSkillData(skill.name)

  return (
    <div className="space-y-4">
      {/* Skill Info */}
      <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded">
        <div className="text-3xl">{skill.icon}</div>
        <div>
          <h3 className="text-foreground font-semibold">{skill.name}</h3>
          <p className="text-muted-foreground text-sm">Level {skill.level}</p>
        </div>
      </div>

      {/* Description */}
      <div>
        <h4 className="text-foreground font-medium mb-2">Description</h4>
        <p className="text-muted-foreground text-sm">{skillData.description}</p>
      </div>

      {/* Experience Progress */}
      <div>
        <h4 className="text-foreground font-medium mb-2">Progress</h4>
        <div className="space-y-1">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${(skill.experience / skill.experienceToNext) * 100}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{skill.experience} XP</span>
            <span>{skill.experienceToNext} XP</span>
          </div>
        </div>
      </div>

      {/* Unlocked Items */}
      <div>
        <h4 className="text-foreground font-medium mb-2">Gatherable Items</h4>
        <div className="grid grid-cols-2 gap-2">
          {skillData.unlocked.map((item) => (
            <div key={item} className="bg-secondary/50 border border-border rounded p-2 text-center">
              <div className="text-muted-foreground text-sm">{item}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Crafting Recipes */}
      <div>
        <h4 className="text-foreground font-medium mb-2">Crafting Recipes</h4>
        <div className="space-y-2">
          {skillData.recipes.map((recipe) => (
            <div key={recipe} className="bg-secondary/50 border border-border rounded p-3">
              <div className="text-foreground text-sm font-medium">{recipe}</div>
              <div className="text-muted-foreground text-xs mt-1">Coming soon...</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
