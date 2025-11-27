import { Player, ItemStack } from "../player/player";
import { ITEM_TEMPLATES, ItemTemplate, getItemTemplate } from "./data/items";
import { World } from "../../core/types";
import { db } from "../../db";

export interface InventoryResult {
  success: boolean;
  reason?: string;
  itemsAdded?: Array<{ itemId: string; quantity: number }>;
  itemsRemoved?: Array<{ itemId: string; quantity: number }>;
}

export interface InventoryUpdateMessage {
  type: "INVENTORY_UPDATE";
  timestamp: number;
  playerId: string;
  inventory: {
    slots: Array<{
      itemId: string;
      quantity: number;
      durability?: number;
    } | null>;
    maxSlots: number;
  };
}

export class ItemManager {
  constructor(private world: World) {}

  // Add items to player's inventory
  async addItemsToInventory(
    player: Player,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<InventoryResult> {
    try {
      const itemsAdded: Array<{ itemId: string; quantity: number }> = [];

      for (const { itemId, quantity } of items) {
        const template = ITEM_TEMPLATES[itemId];
        if (!template) {
          return { success: false, reason: `Unknown item: ${itemId}` };
        }

        let remainingQuantity = quantity;

        // Try to stack with existing items first
        if (template.stackable) {
          remainingQuantity = this.stackWithExistingItems(
            player,
            itemId,
            remainingQuantity,
            template,
            itemsAdded
          );
        }

        // Add remaining items to empty slots
        if (remainingQuantity > 0) {
          const result = this.addToEmptySlots(
            player,
            itemId,
            remainingQuantity,
            template
          );
          if (!result.success) {
            return result;
          }
          itemsAdded.push({
            itemId,
            quantity: result.quantityAdded || 0,
          });
        }
      }

      // Save to database
      await this.saveInventoryToDatabase(player);

      // Send inventory update to client
      this.sendInventoryUpdate(player);

      return { success: true, itemsAdded };
    } catch (error) {
      console.error("Error adding items to inventory:", error);
      return { success: false, reason: "Internal error" };
    }
  }

  // Remove items from player's inventory
  async removeItemsFromInventory(
    player: Player,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<InventoryResult> {
    try {
      const itemsRemoved: Array<{ itemId: string; quantity: number }> = [];

      for (const { itemId, quantity } of items) {
        let remainingToRemove = quantity;
        let totalRemoved = 0;

        // Remove from slots containing this item
        for (let i = 0; i < player.inventory.slots.length; i++) {
          const slot = player.inventory.slots[i];
          if (slot && slot.itemId === itemId) {
            const removeAmount = Math.min(remainingToRemove, slot.quantity);
            slot.quantity -= removeAmount;
            remainingToRemove -= removeAmount;
            totalRemoved += removeAmount;

            // Clear slot if empty
            if (slot.quantity <= 0) {
              player.inventory.slots[i] = null;
            }

            if (remainingToRemove <= 0) break;
          }
        }

        if (remainingToRemove > 0) {
          return {
            success: false,
            reason: `Not enough ${itemId} in inventory`,
          };
        }

        itemsRemoved.push({ itemId, quantity: totalRemoved });
      }

      // Save to database
      await this.saveInventoryToDatabase(player);

      // Send inventory update to client
      this.sendInventoryUpdate(player);

      return { success: true, itemsRemoved };
    } catch (error) {
      console.error("Error removing items from inventory:", error);
      return { success: false, reason: "Internal error" };
    }
  }

  // Check if player has enough of an item
  hasItem(player: Player, itemId: string, quantity: number = 1): boolean {
    return player.hasItem(itemId, quantity);
  }

  // Get player's inventory contents with templates
  getInventoryWithTemplates(
    player: Player
  ): Array<ItemStack & { template: ItemTemplate; slot: number }> {
    return player
      .getInventoryItems()
      .map((item) => {
        const template = ITEM_TEMPLATES[item.itemId];
        if (!template) return null;
        return {
          ...item,
          template,
        };
      })
      .filter(Boolean) as Array<
      ItemStack & { template: ItemTemplate; slot: number }
    >;
  }

  // Load inventory from database
  async loadInventoryFromDatabase(player: Player): Promise<void> {
    try {
      const inventoryItems = await db
        .selectFrom("player_inventories")
        .where("playerId", "=", player.id)
        .selectAll()
        .execute();

      // Clear existing inventory
      player.inventory.slots.fill(null);

      // Populate slots from database
      for (const item of inventoryItems) {
        if (item.slot < player.inventory.slots.length) {
          player.inventory.slots[item.slot] = {
            itemId: item.itemId,
            quantity: item.quantity,
            durability: item.durability || undefined,
          };
        }
      }
    } catch (error) {
      console.error("Error loading inventory from database:", error);
      // Initialize empty inventory if database load fails
      player.inventory.slots.fill(null);
    }
  }

  // Give starting items to new players
  async giveStartingItems(player: Player): Promise<void> {
    const startingItems = [
      { itemId: "health_potion", quantity: 5 },
      { itemId: "mana_potion", quantity: 3 },
      { itemId: "wooden_sword", quantity: 1 },
      { itemId: "leather_armor", quantity: 1 },
      { itemId: "copper_ore", quantity: 10 },
    ];

    await this.addItemsToInventory(player, startingItems);
  }

  // Use/consume an item
  async useItem(
    player: Player,
    slotIndex: number
  ): Promise<{ success: boolean; reason?: string }> {
    const slot = player.inventory.slots[slotIndex];
    if (!slot) {
      return { success: false, reason: "No item in that slot" };
    }

    const template = ITEM_TEMPLATES[slot.itemId];
    if (!template) {
      return { success: false, reason: "Unknown item" };
    }

    // Handle different item types
    switch (template.type) {
      case "consumable":
        return await this.consumeItem(player, slot, template);

      default:
        return { success: false, reason: "Item cannot be used" };
    }
  }

  // Transfer item between players (for trading)
  transferItem(
    fromPlayer: Player,
    toPlayer: Player,
    fromSlot: number,
    quantity?: number
  ): boolean {
    const fromSlotItem = fromPlayer.inventory.slots[fromSlot];
    if (!fromSlotItem) return false;

    const transferQuantity = quantity || fromSlotItem.quantity;

    if (fromSlotItem.quantity < transferQuantity) return false;

    // Add to target player
    const success = toPlayer.addItemToInventory(
      fromSlotItem.itemId,
      transferQuantity,
      fromSlotItem.durability
    );
    if (!success) return false;

    // Remove from source player
    fromPlayer.removeItemFromInventory(fromSlotItem.itemId, transferQuantity);

    return true;
  }

  // Private helper methods

  private stackWithExistingItems(
    player: Player,
    itemId: string,
    quantity: number,
    template: ItemTemplate,
    itemsAdded: Array<{ itemId: string; quantity: number }>
  ): number {
    let remainingQuantity = quantity;

    for (
      let i = 0;
      i < player.inventory.slots.length && remainingQuantity > 0;
      i++
    ) {
      const slot = player.inventory.slots[i];
      if (slot && slot.itemId === itemId) {
        const maxStack = template.maxStack || 1;
        const spaceLeft = maxStack - slot.quantity;

        if (spaceLeft > 0) {
          const addAmount = Math.min(remainingQuantity, spaceLeft);
          slot.quantity += addAmount;
          remainingQuantity -= addAmount;
          itemsAdded.push({ itemId, quantity: addAmount });
        }
      }
    }

    return remainingQuantity;
  }

  private addToEmptySlots(
    player: Player,
    itemId: string,
    quantity: number,
    template: ItemTemplate
  ): { success: boolean; reason?: string; quantityAdded?: number } {
    const maxStack = template.maxStack || 1;
    let remainingQuantity = quantity;
    let totalAdded = 0;

    // Fill empty slots
    for (
      let i = 0;
      i < player.inventory.slots.length && remainingQuantity > 0;
      i++
    ) {
      if (player.inventory.slots[i] === null) {
        const addAmount = Math.min(remainingQuantity, maxStack);
        player.inventory.slots[i] = {
          itemId,
          quantity: addAmount,
          durability: template.durability,
        };
        remainingQuantity -= addAmount;
        totalAdded += addAmount;
      }
    }

    if (remainingQuantity > 0) {
      return { success: false, reason: "Inventory full" };
    }

    return { success: true, quantityAdded: totalAdded };
  }

  private async consumeItem(
    player: Player,
    slot: ItemStack,
    template: ItemTemplate
  ): Promise<{ success: boolean; reason?: string }> {
    // Apply item effects
    if (template.stats) {
      if (template.stats.hp) {
        player.heal(template.stats.hp);
      }
      if (template.stats.mp) {
        // TODO: Add mana restoration
      }
    }

    // Remove one from the stack
    slot.quantity -= 1;
    if (slot.quantity <= 0) {
      // Find and clear the slot
      const slotIndex = player.inventory.slots.indexOf(slot);
      if (slotIndex !== -1) {
        player.inventory.slots[slotIndex] = null;
      }
    }

    // Save changes
    await this.saveInventoryToDatabase(player);
    this.sendInventoryUpdate(player);

    return { success: true };
  }

  private async saveInventoryToDatabase(player: Player): Promise<void> {
    // Clear existing inventory items
    await db
      .deleteFrom("player_inventories")
      .where("playerId", "=", player.id)
      .execute();

    // Insert current inventory items
    const inserts = [];
    for (let slot = 0; slot < player.inventory.slots.length; slot++) {
      const itemStack = player.inventory.slots[slot];
      if (itemStack) {
        inserts.push({
          id: `${player.id}_${slot}_${Date.now()}`,
          playerId: player.id,
          itemId: itemStack.itemId,
          slot,
          quantity: itemStack.quantity,
          durability: itemStack.durability,
        });
      }
    }

    if (inserts.length > 0) {
      await db.insertInto("player_inventories").values(inserts).execute();
    }
  }

  private sendInventoryUpdate(player: Player): void {
    const updateMessage: InventoryUpdateMessage = {
      type: "INVENTORY_UPDATE",
      timestamp: Date.now(),
      playerId: player.id,
      inventory: {
        slots: player.inventory.slots.map((slot) =>
          slot
            ? {
                itemId: slot.itemId,
                quantity: slot.quantity,
                durability: slot.durability,
              }
            : null
        ),
        maxSlots: player.inventory.maxSlots,
      },
    };

    this.world.sendToPlayer(player.id, updateMessage);
  }
}
