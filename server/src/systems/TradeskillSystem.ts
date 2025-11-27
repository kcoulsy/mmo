// Server Tradeskill System
import { System, EntityId, Entity } from "../ecs";
import { GameObject, SkillSet } from "@shared/ecs";

interface HarvestAction {
  playerId: string;
  gameObjectId: string;
  timestamp: number;
}

export class TradeskillSystem implements System {
  private world: any; // Will be set when system is added to world

  setWorld(world: any) {
    this.world = world;
  }

  // Called when a player attempts to harvest a GameObject
  harvest(
    playerId: string,
    gameObjectId: string
  ): { success: boolean; reason?: string; xpGained?: number } {
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
    const xpGained = this.processHarvest({
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

  private processHarvest(action: HarvestAction): number {
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

    // TODO: Add item rewards to player's inventory
    console.log(`${action.playerId} harvested ${gameObject.name}`);
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
}
