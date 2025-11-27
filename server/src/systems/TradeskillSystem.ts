// Server Tradeskill System
import { System, EntityId, Entity } from "../ecs";
import { GameObject, SkillSet } from "@shared/ecs";
import { ItemSystem } from "./ItemSystem";

interface HarvestAction {
  playerId: string;
  gameObjectId: string;
  timestamp: number;
}

export class TradeskillSystem implements System {
  private world: any; // Will be set when system is added to world

  constructor(private itemSystem: ItemSystem) {}

  setWorld(world: any) {
    this.world = world;
  }

  // Called when a player attempts to harvest a GameObject
  async harvest(
    playerId: string,
    gameObjectId: string
  ): Promise<{ success: boolean; reason?: string; xpGained?: number }> {
    const gameObject = this.world?.getComponent(
      gameObjectId,
      "gameObject"
    ) as GameObject;
    if (!gameObject || !gameObject.harvestable) {
      return { success: false, reason: "Object not harvestable" };
    }

    // Check if object is depleted
    if (
      gameObject.currentHarvests !== undefined &&
      gameObject.currentHarvests <= 0
    ) {
      return { success: false, reason: "Object depleted" };
    }

    // Check distance from player to object
    const playerPosition = this.world?.getComponent(playerId, "position");
    const objectPosition = this.world?.getComponent(gameObjectId, "position");

    if (!playerPosition || !objectPosition) {
      return { success: false, reason: "Unable to determine positions" };
    }

    const dx = objectPosition.x - playerPosition.x;
    const dy = objectPosition.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxHarvestDistance = 100; // pixels

    if (distance > maxHarvestDistance) {
      return {
        success: false,
        reason: `Too far away (${distance.toFixed(1)}px > ${maxHarvestDistance}px)`,
      };
    }

    // Check skill requirements
    if (gameObject.requiredSkill && gameObject.requiredLevel) {
      const skillSet = this.world?.getComponent(
        playerId,
        "skillSet"
      ) as SkillSet;
      if (!skillSet) {
        return {
          success: false,
          reason: `Requires ${gameObject.requiredSkill}`,
        };
      }

      const playerSkill = skillSet.skills.get(gameObject.requiredSkill);
      if (!playerSkill || playerSkill.level < gameObject.requiredLevel) {
        return {
          success: false,
          reason: `Requires ${gameObject.requiredSkill} level ${gameObject.requiredLevel}`,
        };
      }
    }

    // Process harvest immediately
    const xpGained = await this.processHarvest({
      playerId,
      gameObjectId,
      timestamp: Date.now(),
    });

    return { success: true, xpGained };
  }

  update(entities: Map<EntityId, Entity>, deltaTime: number): void {
    const now = Date.now();

    // Handle respawning of depleted objects
    for (const [entityId] of entities) {
      const gameObject = this.world?.getComponent(
        entityId,
        "gameObject"
      ) as GameObject;
      if (!gameObject || !gameObject.respawnTime || !gameObject.lastHarvested) {
        continue;
      }

      const timeSinceHarvest = (now - gameObject.lastHarvested) / 1000; // Convert to seconds
      if (timeSinceHarvest >= gameObject.respawnTime) {
        // Respawn the object
        this.world?.removeComponent(entityId, "gameObject");
        this.world?.addComponent(entityId, {
          ...gameObject,
          currentHarvests: gameObject.maxHarvests,
          lastHarvested: undefined,
        } as GameObject);

        console.log(`Respawned ${gameObject.name} (${entityId})`);
      }
    }
  }

  private async processHarvest(action: HarvestAction): Promise<number> {
    const gameObject = this.world?.getComponent(
      action.gameObjectId,
      "gameObject"
    ) as GameObject;
    const skillSet = this.world?.getComponent(
      action.playerId,
      "skillSet"
    ) as SkillSet;

    if (!gameObject || !skillSet) {
      return 0;
    }

    if (!gameObject || !skillSet) {
      return 0;
    }

    // Give experience to the relevant skill
    let xpGained = 0;
    if (gameObject.requiredSkill) {
      const currentSkill = skillSet.skills.get(gameObject.requiredSkill);
      if (currentSkill) {
        xpGained = this.calculateXpGain(gameObject);
        const newXp = currentSkill.xp + xpGained;
        const newLevel = Math.floor(newXp / 100) + 1;

        skillSet.skills.set(gameObject.requiredSkill, {
          xp: newXp,
          level: newLevel,
        });

        console.log(
          `${action.playerId} gained ${xpGained} XP in ${gameObject.requiredSkill} (now level ${newLevel})`
        );
      }
    }

    return xpGained;

    // Update the GameObject
    const currentHarvests = gameObject.currentHarvests || 0;
    if (currentHarvests > 0) {
      this.world.removeComponent(action.gameObjectId, "gameObject");
      this.world.addComponent(action.gameObjectId, {
        ...gameObject,
        currentHarvests: currentHarvests - 1,
        lastHarvested: action.timestamp,
      } as GameObject);
    }

    // Add item rewards to player's inventory
    const itemsToAdd = this.getHarvestRewards(gameObject);
    if (itemsToAdd.length > 0) {
      await this.itemSystem.addItemsToInventory(action.playerId, itemsToAdd);
      console.log(
        `${action.playerId} harvested ${gameObject.name} and received:`,
        itemsToAdd
      );
    } else {
      console.log(`${action.playerId} harvested ${gameObject.name} (no items)`);
    }
  }

  private calculateXpGain(gameObject: GameObject): number {
    // Base XP based on object type and level requirement
    const baseXp = gameObject.requiredLevel
      ? gameObject.requiredLevel * 10
      : 25;

    // Add some randomness
    const variance = Math.random() * 0.2 - 0.1; // ±10%
    return Math.floor(baseXp * (1 + variance));
  }

  private getHarvestRewards(
    gameObject: GameObject
  ): Array<{ itemId: string; quantity: number }> {
    const rewards: Array<{ itemId: string; quantity: number }> = [];

    // Determine rewards based on object type and subtype
    switch (gameObject.objectType) {
      case "tree":
        if (gameObject.subtype === "oak") {
          rewards.push({ itemId: "copper_ore", quantity: 1 }); // Placeholder for wood
        } else {
          rewards.push({ itemId: "copper_ore", quantity: 1 }); // Generic wood
        }
        break;

      case "mining_node":
        if (gameObject.subtype === "copper") {
          rewards.push({
            itemId: "copper_ore",
            quantity: Math.floor(Math.random() * 3) + 1,
          });
        } else if (gameObject.subtype === "iron") {
          rewards.push({
            itemId: "iron_ore",
            quantity: Math.floor(Math.random() * 2) + 1,
          });
        } else if (gameObject.subtype === "gold") {
          rewards.push({
            itemId: "gold_ore",
            quantity: Math.floor(Math.random() * 2) + 1,
          });
        } else {
          rewards.push({ itemId: "copper_ore", quantity: 1 }); // Default ore
        }
        break;

      case "herb":
        if (gameObject.subtype === "peacebloom") {
          rewards.push({
            itemId: "peacebloom",
            quantity: Math.floor(Math.random() * 2) + 1,
          });
        } else if (gameObject.subtype === "silverleaf") {
          rewards.push({
            itemId: "silverleaf",
            quantity: Math.floor(Math.random() * 2) + 1,
          });
        } else {
          rewards.push({ itemId: "peacebloom", quantity: 1 }); // Default herb
        }
        break;

      default:
        // Generic reward for unknown object types
        rewards.push({ itemId: "copper_ore", quantity: 1 });
        break;
    }

    return rewards;
  }
}
