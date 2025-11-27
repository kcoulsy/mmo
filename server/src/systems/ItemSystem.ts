// Server Item System - Handles inventory management
import { System, EntityId } from "../ecs";
import { Inventory, ItemStack } from "@shared/ecs";
import { ITEM_TEMPLATES, ItemTemplate } from "../data/items";
import { db } from "../db";
import { InventoryUpdateMessage } from "@shared/messages";

export interface InventoryResult {
  success: boolean;
  reason?: string;
  itemsAdded?: Array<{ itemId: string; quantity: number }>;
  itemsRemoved?: Array<{ itemId: string; quantity: number }>;
}

export class ItemSystem implements System {
  private world: any; // Will be set when system is added to world

  constructor(private server?: any) {} // WebSocketServer

  setWorld(world: any) {
    this.world = world;
  }

  // Add items to player's inventory
  async addItemsToInventory(
    playerId: string,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<InventoryResult> {
    try {
      // Get player's inventory component
      const entityId = this.world?.getEntityByPlayerId?.(playerId);
      if (!entityId) {
        return { success: false, reason: "Player not found" };
      }

      const inventory = this.world.getComponent(
        entityId,
        "inventory"
      ) as Inventory;
      if (!inventory) {
        return { success: false, reason: "Player has no inventory" };
      }

      const itemsAdded: Array<{ itemId: string; quantity: number }> = [];

      for (const { itemId, quantity } of items) {
        const template = ITEM_TEMPLATES[itemId];
        if (!template) {
          return { success: false, reason: `Unknown item: ${itemId}` };
        }

        // Try to stack with existing items first
        if (template.stackable) {
          const existingSlot = inventory.slots.find(
            (slot) => slot && slot.itemId === itemId
          );

          if (existingSlot) {
            const maxStack = template.maxStack || 1;
            const spaceLeft = maxStack - existingSlot.quantity;

            if (spaceLeft > 0) {
              const addAmount = Math.min(quantity, spaceLeft);
              existingSlot.quantity += addAmount;
              itemsAdded.push({ itemId, quantity: addAmount });

              if (quantity > addAmount) {
                // Still have items left, find new slot
                const remainingQuantity = quantity - addAmount;
                const result = await this.findEmptySlotAndAdd(
                  inventory,
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
            } else {
              // Existing stack is full, find new slot
              const result = await this.findEmptySlotAndAdd(
                inventory,
                itemId,
                quantity,
                template
              );
              if (!result.success) {
                return result;
              }
              itemsAdded.push({ itemId, quantity: result.quantityAdded || 0 });
            }
          } else {
            // No existing stack, find empty slot
            const result = await this.findEmptySlotAndAdd(
              inventory,
              itemId,
              quantity,
              template
            );
            if (!result.success) {
              return result;
            }
            itemsAdded.push({ itemId, quantity: result.quantityAdded || 0 });
          }
        } else {
          // Non-stackable items need individual slots
          for (let i = 0; i < quantity; i++) {
            const emptySlot = inventory.slots.findIndex(
              (slot) => slot === null
            );
            if (emptySlot === -1) {
              return { success: false, reason: "Inventory full" };
            }

            inventory.slots[emptySlot] = {
              itemId,
              quantity: 1,
              durability: template.durability,
            };
            itemsAdded.push({ itemId, quantity: 1 });
          }
        }
      }

      // Save to database
      await this.saveInventoryToDatabase(playerId, inventory);

      // Send inventory update to client
      this.sendInventoryUpdate(playerId, inventory);

      return { success: true, itemsAdded };
    } catch (error) {
      console.error("Error adding items to inventory:", error);
      return { success: false, reason: "Internal error" };
    }
  }

  // Remove items from player's inventory
  async removeItemsFromInventory(
    playerId: string,
    items: Array<{ itemId: string; quantity: number }>
  ): Promise<InventoryResult> {
    try {
      const entityId = this.world?.getEntityByPlayerId?.(playerId);
      if (!entityId) {
        return { success: false, reason: "Player not found" };
      }

      const inventory = this.world.getComponent(
        entityId,
        "inventory"
      ) as Inventory;
      if (!inventory) {
        return { success: false, reason: "Player has no inventory" };
      }

      const itemsRemoved: Array<{ itemId: string; quantity: number }> = [];

      for (const { itemId, quantity } of items) {
        let remainingToRemove = quantity;

        // Find slots with this item
        for (
          let slotIndex = 0;
          slotIndex < inventory.slots.length && remainingToRemove > 0;
          slotIndex++
        ) {
          const slot = inventory.slots[slotIndex];
          if (slot && slot.itemId === itemId) {
            const removeAmount = Math.min(remainingToRemove, slot.quantity);
            slot.quantity -= removeAmount;
            remainingToRemove -= removeAmount;
            itemsRemoved.push({ itemId, quantity: removeAmount });

            // Remove slot if empty
            if (slot.quantity <= 0) {
              inventory.slots[slotIndex] = null;
            }
          }
        }

        if (remainingToRemove > 0) {
          return {
            success: false,
            reason: `Not enough ${itemId} in inventory`,
          };
        }
      }

      // Save to database
      await this.saveInventoryToDatabase(playerId, inventory);

      // Send inventory update to client
      this.sendInventoryUpdate(playerId, inventory);

      return { success: true, itemsRemoved };
    } catch (error) {
      console.error("Error removing items from inventory:", error);
      return { success: false, reason: "Internal error" };
    }
  }

  // Check if player has enough of an item
  hasItem(playerId: string, itemId: string, quantity: number = 1): boolean {
    const entityId = this.world?.getEntityByPlayerId?.(playerId);
    if (!entityId) return false;

    const inventory = this.world.getComponent(
      entityId,
      "inventory"
    ) as Inventory;
    if (!inventory) return false;

    let totalQuantity = 0;
    for (const slot of inventory.slots) {
      if (slot && slot.itemId === itemId) {
        totalQuantity += slot.quantity;
        if (totalQuantity >= quantity) return true;
      }
    }
    return false;
  }

  // Get player's inventory contents
  getInventory(playerId: string): Inventory | null {
    const entityId = this.world?.getEntityByPlayerId?.(playerId);
    if (!entityId) return null;

    return this.world.getComponent(entityId, "inventory") as Inventory;
  }

  // Get inventory as array of item stacks with template data
  getInventoryWithTemplates(
    playerId: string
  ): Array<ItemStack & { template: ItemTemplate }> | null {
    const inventory = this.getInventory(playerId);
    if (!inventory) return null;

    return inventory.slots
      .map((slot) => {
        if (!slot) return null;
        const template = ITEM_TEMPLATES[slot.itemId];
        if (!template) return null;

        return {
          ...slot,
          template,
        };
      })
      .filter(Boolean) as Array<ItemStack & { template: ItemTemplate }>;
  }

  // Initialize player inventory
  initializePlayerInventory(entityId: EntityId, playerId: string): void {
    const inventory: Inventory = {
      type: "inventory",
      slots: new Array(32).fill(null), // 32 slots by default
      maxSlots: 32,
    };

    this.world.addComponent(entityId, inventory);
  }

  // Load inventory from database
  async loadInventoryFromDatabase(
    playerId: string,
    entityId: EntityId
  ): Promise<void> {
    try {
      const inventoryItems = await db
        .selectFrom("player_inventories")
        .where("playerId", "=", playerId)
        .selectAll()
        .execute();

      const inventory: Inventory = {
        type: "inventory",
        slots: new Array(32).fill(null),
        maxSlots: 32,
      };

      // Populate slots from database
      for (const item of inventoryItems) {
        if (item.slot < inventory.slots.length) {
          inventory.slots[item.slot] = {
            itemId: item.itemId,
            quantity: item.quantity,
            durability: item.durability || undefined,
          };
        }
      }

      this.world.addComponent(entityId, inventory);
    } catch (error) {
      console.error("Error loading inventory from database:", error);
      // Initialize empty inventory if database load fails
      this.initializePlayerInventory(entityId, playerId);
    }
  }

  // Save inventory to database
  private async saveInventoryToDatabase(
    playerId: string,
    inventory: Inventory
  ): Promise<void> {
    // Clear existing inventory items
    await db
      .deleteFrom("player_inventories")
      .where("playerId", "=", playerId)
      .execute();

    // Insert current inventory items
    const inserts = [];
    for (let slot = 0; slot < inventory.slots.length; slot++) {
      const itemStack = inventory.slots[slot];
      if (itemStack) {
        inserts.push({
          id: `${playerId}_${slot}_${Date.now()}`,
          playerId,
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

  // Helper method to find empty slot and add items
  private async findEmptySlotAndAdd(
    inventory: Inventory,
    itemId: string,
    quantity: number,
    template: ItemTemplate
  ): Promise<{ success: boolean; reason?: string; quantityAdded?: number }> {
    const maxStack = template.maxStack || 1;
    let remainingQuantity = quantity;

    // Fill existing partial stacks first
    for (const slot of inventory.slots) {
      if (slot && slot.itemId === itemId && slot.quantity < maxStack) {
        const spaceLeft = maxStack - slot.quantity;
        const addAmount = Math.min(remainingQuantity, spaceLeft);
        slot.quantity += addAmount;
        remainingQuantity -= addAmount;
        if (remainingQuantity <= 0) break;
      }
    }

    // Fill empty slots
    while (remainingQuantity > 0) {
      const emptySlot = inventory.slots.findIndex((slot) => slot === null);
      if (emptySlot === -1) {
        return { success: false, reason: "Inventory full" };
      }

      const addAmount = Math.min(remainingQuantity, maxStack);
      inventory.slots[emptySlot] = {
        itemId,
        quantity: addAmount,
        durability: template.durability,
      };
      remainingQuantity -= addAmount;
    }

    return { success: true, quantityAdded: quantity - remainingQuantity };
  }

  // Send inventory update to client
  private sendInventoryUpdate(playerId: string, inventory: Inventory): void {
    if (!this.server) return;

    const updateMessage: InventoryUpdateMessage = {
      type: "INVENTORY_UPDATE",
      timestamp: Date.now(),
      playerId,
      inventory: {
        slots: inventory.slots.map((slot) =>
          slot
            ? {
                itemId: slot.itemId,
                quantity: slot.quantity,
                durability: slot.durability,
              }
            : null
        ),
        maxSlots: inventory.maxSlots,
      },
    };

    this.server.sendToPlayer(playerId, updateMessage);
  }

  update(entities: Map<EntityId, any>, deltaTime: number): void {
    // Item system doesn't need regular updates
  }
}
