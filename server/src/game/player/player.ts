import { Position } from "../common/position";
import { getItemTemplate } from "../items/data/items";

export interface PlayerStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  attack: number;
  defense: number;
  moveSpeed: number;
  level: number;
}

export interface PlayerVelocity {
  vx: number;
  vy: number;
}

export interface ItemStack {
  itemId: string;
  quantity: number;
  durability?: number;
}

export interface PlayerInventory {
  slots: (ItemStack | null)[];
  maxSlots: number;
}

export class Player {
  id: string;
  name: string;
  position: Position;
  velocity: PlayerVelocity;
  stats: PlayerStats;
  inventory: PlayerInventory;
  connectionId?: string;

  constructor(
    id: string,
    name: string,
    position: Position,
    stats: PlayerStats,
    connectionId?: string
  ) {
    this.id = id;
    this.name = name;
    this.position = { ...position }; // Copy position
    this.velocity = { vx: 0, vy: 0 };
    this.stats = { ...stats }; // Copy stats
    this.inventory = {
      slots: new Array(32).fill(null), // Default 32 slots
      maxSlots: 32,
    };
    this.connectionId = connectionId;
  }

  // Update position
  setPosition(x: number, y: number, z?: number): void {
    this.position.x = x;
    this.position.y = y;
    this.position.z = z ?? this.position.z ?? 0;
  }

  // Update velocity
  setVelocity(vx: number, vy: number): void {
    this.velocity.vx = vx;
    this.velocity.vy = vy;
  }

  // Update stats
  updateStats(updates: Partial<PlayerStats>): void {
    Object.assign(this.stats, updates);
  }

  // Check if player is alive
  isAlive(): boolean {
    return this.stats.hp > 0;
  }

  // Heal player
  heal(amount: number): void {
    this.stats.hp = Math.min(this.stats.hp + amount, this.stats.maxHp);
  }

  // Damage player
  damage(amount: number): void {
    this.stats.hp = Math.max(0, this.stats.hp - amount);
  }

  // Inventory methods
  addItemToInventory(
    itemId: string,
    quantity: number,
    durability?: number
  ): boolean {
    // Try to stack with existing items first
    for (let i = 0; i < this.inventory.slots.length; i++) {
      const slot = this.inventory.slots[i];
      if (slot && slot.itemId === itemId) {
        // Check if we can stack more
        const template = getItemTemplate(itemId);
        if (template?.stackable) {
          const maxStack = template.maxStack || 1;
          const spaceLeft = maxStack - slot.quantity;
          if (spaceLeft > 0) {
            const addAmount = Math.min(quantity, spaceLeft);
            slot.quantity += addAmount;
            quantity -= addAmount;
            if (quantity <= 0) return true;
          }
        }
      }
    }

    // Find empty slot for remaining items
    for (let i = 0; i < this.inventory.slots.length; i++) {
      if (this.inventory.slots[i] === null) {
        this.inventory.slots[i] = {
          itemId,
          quantity,
          durability,
        };
        return true;
      }
    }

    return false; // No space available
  }

  removeItemFromInventory(itemId: string, quantity: number): boolean {
    let remainingToRemove = quantity;

    // Remove from slots containing this item
    for (let i = 0; i < this.inventory.slots.length; i++) {
      const slot = this.inventory.slots[i];
      if (slot && slot.itemId === itemId) {
        const removeAmount = Math.min(remainingToRemove, slot.quantity);
        slot.quantity -= removeAmount;
        remainingToRemove -= removeAmount;

        // Clear slot if empty
        if (slot.quantity <= 0) {
          this.inventory.slots[i] = null;
        }

        if (remainingToRemove <= 0) return true;
      }
    }

    return false; // Not enough items to remove
  }

  hasItem(itemId: string, quantity: number = 1): boolean {
    let totalQuantity = 0;
    for (const slot of this.inventory.slots) {
      if (slot && slot.itemId === itemId) {
        totalQuantity += slot.quantity;
        if (totalQuantity >= quantity) return true;
      }
    }
    return false;
  }

  getInventoryItems(): (ItemStack & { slot: number })[] {
    return this.inventory.slots
      .map((slot, index) => (slot ? { ...slot, slot: index } : null))
      .filter(Boolean) as (ItemStack & { slot: number })[];
  }
}
