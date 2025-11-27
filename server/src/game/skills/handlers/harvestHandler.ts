import { registerHandler } from "../../../core/types";
import {
  HarvestObjectMessage,
  HarvestResultMessage,
  ChatMessage,
} from "@shared/messages";

function sendSystemChatMessage(session: any, message: string) {
  const chatMessage: ChatMessage = {
    type: "CHAT_MESSAGE",
    timestamp: Date.now(),
    playerId: "system",
    playerName: "System",
    message,
    mode: "global",
  };
  session.send(chatMessage);
}

export const harvestHandler = registerHandler(
  "HARVEST_OBJECT",
  async (ctx, message: HarvestObjectMessage) => {
    try {
      const { session, world } = ctx;

      console.log(`[HARVEST] Handler called for message:`, message);

      if (!session.playerId) {
        console.log(`[HARVEST] No playerId in session`);
        return;
      }

      console.log(
        `[HARVEST] Player ${session.playerId} attempting to harvest ${message.gameObjectId}`
      );

      const gameObject = world.gameObjectManager.getObject(
        message.gameObjectId
      );
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

      const template = world.gameObjectManager.getTemplate(
        gameObject.templateId
      );
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
        // Send chat message to inform player
        sendSystemChatMessage(
          session,
          `This ${template.name} has been depleted and will respawn soon.`
        );

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
        // Send chat message to inform player
        sendSystemChatMessage(
          session,
          `You are too far away to harvest this ${template.name}.`
        );

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
          // Send chat message to inform player
          sendSystemChatMessage(
            session,
            `You need ${template.requiredSkill} level ${template.requiredLevel} to harvest ${template.name}.`
          );

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

      // Get player's skill level for harvesting
      const playerSkillLevel = template.requiredSkill
        ? world.playerManager.getPlayerSkill(
            session.playerId,
            template.requiredSkill
          )?.level || 1
        : 1;

      // Calculate XP that will be gained
      const xpGained = calculateXpGain(template);

      // Perform the harvest action
      const harvestResult = await processHarvestAction(
        world,
        session.playerId,
        message.gameObjectId,
        playerSkillLevel,
        xpGained
      );

      // Send harvest result to player
      const resultMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: true,
        xpGained,
        itemsGained: harvestResult.itemsGained,
      };

      session.send(resultMessage);
    } catch (error) {
      console.error(`[HARVEST] Error in harvest handler:`, error);
      // Send error response to client
      const errorMessage: HarvestResultMessage = {
        type: "HARVEST_RESULT",
        timestamp: Date.now(),
        gameObjectId: message.gameObjectId,
        success: false,
        reason: "Server error occurred",
      };
      ctx.session.send(errorMessage);
    }
  }
);

function calculateXpGain(template: any): number {
  // Base XP based on level requirement
  const baseXp = template.requiredLevel ? template.requiredLevel * 10 : 25;

  // Add some randomness
  const variance = Math.random() * 0.2 - 0.1; // ±10%
  return Math.floor(baseXp * (1 + variance));
}

async function processHarvestAction(
  world: any,
  playerId: string,
  gameObjectId: string,
  playerSkillLevel: number,
  xpGained: number
): Promise<{
  itemsGained: Array<{ itemId: string; quantity: number }>;
}> {
  // Update player skill XP
  const gameObject = world.gameObjectManager.getObject(gameObjectId)!;
  const template = world.gameObjectManager.getTemplate(gameObject.templateId);
  if (template && template.requiredSkill) {
    world.playerManager.addSkillXp(playerId, template.requiredSkill, xpGained);
  }

  // Harvest the object and get the loot
  const harvestResult = world.gameObjectManager.harvestObject(
    gameObjectId,
    playerSkillLevel
  );

  if (!harvestResult.success) {
    throw new Error(`Harvest failed: ${harvestResult.reason}`);
  }

  // Use the loot from harvestObject instead of our own calculation
  const itemsGained = harvestResult.loot || [];

  // Add item rewards to player's inventory
  if (itemsGained.length > 0) {
    const player = world.playerManager.getPlayer(playerId);
    if (!player) {
      throw new Error(
        `Player ${playerId} not found when adding harvested items`
      );
    }
    await world.itemManager.addItemsToInventory(player, itemsGained);
    console.log(
      `${playerId} harvested ${template?.name} and received:`,
      itemsGained.map(
        (item: { itemId: string; quantity: number }) =>
          `${item.quantity}x ${item.itemId}`
      )
    );
  } else {
    console.log(`${playerId} harvested ${template?.name} (no items)`);
  }

  return {
    itemsGained,
  };
}
