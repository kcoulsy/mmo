import { registerHandler } from "../../../core/types";
import { HarvestObjectMessage, HarvestResultMessage } from "@shared/messages";

export const harvestHandler = registerHandler(
  "HARVEST_OBJECT",
  async (ctx, message: HarvestObjectMessage) => {
    const { session, world } = ctx;

    if (!session.playerId) return;

    console.log(
      `Player ${session.playerId} attempting to harvest ${message.gameObjectId}`
    );

    const gameObject = world.gameObjectManager.getObject(message.gameObjectId);
    if (!gameObject) {
      const resultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: false,
        reason: "Object not found",
      };
      session.send(resultMessage);
      return;
    }

    const template = world.gameObjectManager.getTemplate(gameObject.templateId);
    if (!template) {
      const resultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: false,
        reason: "Invalid object template",
      };
      session.send(resultMessage);
      return;
    }

    // Check if object is depleted
    if (!gameObject.isActive) {
      const resultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: false,
        reason: "Object depleted",
      };
      session.send(resultMessage);
      return;
    }

    // Check distance from player to object
    const playerPosition = world.playerManager.getPlayerPosition(
      session.playerId
    );
    if (!playerPosition) {
      const resultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: false,
        reason: "Unable to determine player position",
      };
      session.send(resultMessage);
      return;
    }

    const dx = gameObject.position.x - playerPosition.x;
    const dy = gameObject.position.y - playerPosition.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const maxHarvestDistance = 100; // pixels

    if (distance > maxHarvestDistance) {
      const resultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: false,
        reason: `Too far away (${distance.toFixed(1)}px > ${maxHarvestDistance}px)`,
      };
      session.send(resultMessage);
      return;
    }

    // Check skill requirements
    if (template.requiredSkill && template.requiredLevel) {
      const playerSkill = world.playerManager.getPlayerSkill(
        session.playerId,
        template.requiredSkill
      );
      if (!playerSkill || playerSkill.level < template.requiredLevel) {
        const resultMessage: HarvestResultMessage = {
          type: "HARVEST_RESULT",
          timestamp: Date.now(),
          gameObjectId: message.gameObjectId,
          success: false,
          reason: `Requires ${template.requiredSkill} level ${template.requiredLevel}`,
        };
        session.send(resultMessage);
        return;
      }
    }

    // Calculate XP and get items that will be gained
    const xpGained = calculateXpGain(template);
    const itemsGained = getHarvestRewards(template);

    // Process harvest
    await processHarvestAction(
      world,
      session.playerId,
      message.gameObjectId,
      xpGained,
      itemsGained
    );

    const resultMessage: HarvestResultMessage = {
      type: "HARVEST_RESULT",
      timestamp: Date.now(),
      gameObjectId: message.gameObjectId,
      success: true,
      xpGained,
      itemsGained,
    };

    session.send(resultMessage);
  }
);

function calculateXpGain(template: any): number {
  // Base XP based on level requirement
  const baseXp = template.requiredLevel ? template.requiredLevel * 10 : 25;

  // Add some randomness
  const variance = Math.random() * 0.2 - 0.1; // ±10%
  return Math.floor(baseXp * (1 + variance));
}

function getHarvestRewards(
  template: any
): Array<{ itemId: string; quantity: number }> {
  const rewards: Array<{ itemId: string; quantity: number }> = [];

  // Determine rewards based on object type and subtype
  switch (template.objectType) {
    case "tree":
      if (template.subtype === "oak") {
        rewards.push({ itemId: "copper_ore", quantity: 1 }); // Placeholder for wood
      } else {
        rewards.push({ itemId: "copper_ore", quantity: 1 }); // Generic wood
      }
      break;

    case "mining_node":
      if (template.subtype === "copper") {
        rewards.push({
          itemId: "copper_ore",
          quantity: Math.floor(Math.random() * 3) + 1,
        });
      } else if (template.subtype === "iron") {
        rewards.push({
          itemId: "iron_ore",
          quantity: Math.floor(Math.random() * 2) + 1,
        });
      } else if (template.subtype === "gold") {
        rewards.push({
          itemId: "gold_ore",
          quantity: Math.floor(Math.random() * 2) + 1,
        });
      } else {
        rewards.push({ itemId: "copper_ore", quantity: 1 }); // Default ore
      }
      break;

    case "herb":
      if (template.subtype === "peacebloom") {
        rewards.push({
          itemId: "peacebloom",
          quantity: Math.floor(Math.random() * 2) + 1,
        });
      } else if (template.subtype === "silverleaf") {
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

async function processHarvestAction(
  world: any,
  playerId: string,
  gameObjectId: string,
  xpGained: number,
  itemsGained: Array<{ itemId: string; quantity: number }>
): Promise<void> {
  // Update player skill XP
  const gameObject = world.gameObjectManager.getObject(gameObjectId)!;
  const template = world.gameObjectManager.getTemplate(gameObject.templateId);
  if (template && template.requiredSkill) {
    world.playerManager.addSkillXp(playerId, template.requiredSkill, xpGained);
  }

  // Harvest the object (reduce its harvest count)
  world.gameObjectManager.harvestObject(gameObjectId);

  // Add item rewards to player's inventory
  if (itemsGained.length > 0) {
    await world.itemManager.addItemsToInventory(playerId, itemsGained);
    console.log(
      `${playerId} harvested ${template?.name} and received:`,
      itemsGained.map((item) => `${item.quantity}x ${item.itemId}`)
    );
  } else {
    console.log(`${playerId} harvested ${template?.name} (no items)`);
  }
}
