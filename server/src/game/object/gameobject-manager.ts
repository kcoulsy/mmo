import { Position } from "../common/position";
import { World } from "../../core/types";
import { GameObjectUpdateMessage } from "@shared/messages";

export interface GameObjectTemplate {
  id: string;
  objectType: "tree" | "mining_node" | "herb" | "npc" | "chest" | "door";
  subtype?: string;
  name: string;
  spriteId: string;
  requiredSkill?: string;
  requiredLevel?: number;
  respawnTime?: number; // in seconds
  maxHarvests?: number;
  lootTable?: Array<{ itemId: string; quantity: number; chance: number }>;
  collider?: {
    shape: "circle" | "rectangle";
    radius?: number;
    width?: number;
    height?: number;
  };
}

export interface GameObject {
  id: string;
  templateId: string;
  position: Position;
  isActive: boolean;
  harvestCount: number;
  lastHarvestTime?: number;
  respawnTime?: number;
}

export class GameObjectManager {
  private objects: Map<string, GameObject> = new Map();
  private templates: Map<string, GameObjectTemplate> = new Map();
  private nextObjectId = 1;

  constructor(private world: World) {
    this.initializeTemplates();
  }

  private initializeTemplates(): void {
    // Tree templates
    this.templates.set("oak_tree", {
      id: "oak_tree",
      objectType: "tree",
      subtype: "oak",
      name: "Oak Tree",
      spriteId: "tree_oak",
      requiredSkill: "Woodcutting",
      // requiredLevel: 0, // Basic resources don't require skill levels
      respawnTime: 300, // 5 minutes
      maxHarvests: 10,
      lootTable: [
        { itemId: "copper_ore", quantity: 1, chance: 0.3 },
        // Could add logs when woodcutting system is implemented
      ],
      collider: { shape: "circle", radius: 32 },
    });

    this.templates.set("pine_tree", {
      id: "pine_tree",
      objectType: "tree",
      subtype: "pine",
      name: "Pine Tree",
      spriteId: "tree_pine",
      requiredSkill: "Woodcutting",
      requiredLevel: 5,
      respawnTime: 300,
      maxHarvests: 8,
      collider: { shape: "circle", radius: 28 },
    });

    this.templates.set("maple_tree", {
      id: "maple_tree",
      objectType: "tree",
      subtype: "maple",
      name: "Maple Tree",
      spriteId: "tree_maple",
      requiredSkill: "Woodcutting",
      requiredLevel: 15,
      respawnTime: 600, // 10 minutes
      maxHarvests: 6,
      collider: { shape: "circle", radius: 30 },
    });

    // Mining node templates
    this.templates.set("copper_node", {
      id: "copper_node",
      objectType: "mining_node",
      subtype: "copper",
      name: "Copper Vein",
      spriteId: "mining_copper",
      requiredSkill: "Mining",
      // requiredLevel: 0, // Basic resources don't require skill levels
      respawnTime: 480, // 8 minutes
      maxHarvests: 5,
      lootTable: [
        { itemId: "copper_ore", quantity: 1, chance: 1.0 },
        { itemId: "copper_ore", quantity: 2, chance: 0.5 },
      ],
      collider: { shape: "circle", radius: 24 },
    });

    this.templates.set("iron_node", {
      id: "iron_node",
      objectType: "mining_node",
      subtype: "iron",
      name: "Iron Vein",
      spriteId: "mining_iron",
      requiredSkill: "Mining",
      requiredLevel: 10,
      respawnTime: 600, // 10 minutes
      maxHarvests: 4,
      lootTable: [
        { itemId: "iron_ore", quantity: 1, chance: 1.0 },
        { itemId: "iron_ore", quantity: 2, chance: 0.3 },
      ],
      collider: { shape: "circle", radius: 24 },
    });

    // Herb templates
    this.templates.set("peacebloom", {
      id: "peacebloom",
      objectType: "herb",
      subtype: "peacebloom",
      name: "Peacebloom",
      spriteId: "herb_peacebloom",
      requiredSkill: "Herbalism",
      // requiredLevel: 0, // Basic resources don't require skill levels
      respawnTime: 240, // 4 minutes
      maxHarvests: 3,
      lootTable: [
        { itemId: "peacebloom", quantity: 1, chance: 1.0 },
        { itemId: "peacebloom", quantity: 2, chance: 0.4 },
      ],
      collider: { shape: "circle", radius: 16 },
    });

    this.templates.set("silverleaf", {
      id: "silverleaf",
      objectType: "herb",
      subtype: "silverleaf",
      name: "Silverleaf",
      spriteId: "herb_silverleaf",
      requiredSkill: "Herbalism",
      requiredLevel: 5,
      respawnTime: 300, // 5 minutes
      maxHarvests: 2,
      lootTable: [{ itemId: "silverleaf", quantity: 1, chance: 1.0 }],
      collider: { shape: "circle", radius: 16 },
    });
  }

  // Spawn a game object at the specified position
  spawnObject(
    templateId: string,
    x: number,
    y: number,
    z: number = 0
  ): string | null {
    const template = this.templates.get(templateId);
    if (!template) {
      console.warn(`Unknown GameObject template: ${templateId}`);
      return null;
    }

    const objectId = `object_${this.nextObjectId++}`;
    const gameObject: GameObject = {
      id: objectId,
      templateId,
      position: { x, y, z },
      isActive: true,
      harvestCount: 0,
    };

    this.objects.set(objectId, gameObject);
    console.log(
      `[GAMEOBJECT] Spawned ${template.name} (${objectId}) at (${x}, ${y}) - isActive: ${gameObject.isActive}`
    );

    return objectId;
  }

  // Get a game object by ID
  getObject(objectId: string): GameObject | undefined {
    const obj = this.objects.get(objectId);
    console.log(
      `[GAMEOBJECT] getObject(${objectId}) -> ${obj ? "found" : "not found"}`
    );
    if (obj) {
      console.log(`[GAMEOBJECT] Object details:`, {
        id: obj.id,
        templateId: obj.templateId,
        isActive: obj.isActive,
        harvestCount: obj.harvestCount,
      });
    }
    return obj;
  }

  // Get all active game objects
  getAllObjects(): GameObject[] {
    return Array.from(this.objects.values()).filter((obj) => obj.isActive);
  }

  // Get objects within a certain range of a position
  getObjectsInRange(x: number, y: number, range: number): GameObject[] {
    return this.getAllObjects().filter((obj) => {
      const dx = obj.position.x - x;
      const dy = obj.position.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= range;
    });
  }

  // Get template by ID
  getTemplate(templateId: string): GameObjectTemplate | undefined {
    return this.templates.get(templateId);
  }

  // Attempt to harvest a game object
  harvestObject(
    objectId: string,
    playerSkillLevel: number = 1
  ): {
    success: boolean;
    reason?: string;
    loot?: Array<{ itemId: string; quantity: number }>;
  } {
    const gameObject = this.objects.get(objectId);
    if (!gameObject || !gameObject.isActive) {
      return { success: false, reason: "Object not found or not active" };
    }

    const template = this.templates.get(gameObject.templateId);
    if (!template) {
      return { success: false, reason: "Object template not found" };
    }

    // Check skill requirements
    // if (template.requiredLevel && playerSkillLevel < template.requiredLevel) {
    //   return {
    //     success: false,
    //     reason: `Requires ${template.requiredSkill} level ${template.requiredLevel}`,
    //   };
    // }

    // Check if object can still be harvested
    if (
      template.maxHarvests &&
      gameObject.harvestCount >= template.maxHarvests
    ) {
      return { success: false, reason: "Object is depleted" };
    }

    // Generate loot
    const loot: Array<{ itemId: string; quantity: number }> = [];
    if (template.lootTable) {
      for (const lootItem of template.lootTable) {
        if (Math.random() <= lootItem.chance) {
          loot.push({
            itemId: lootItem.itemId,
            quantity: lootItem.quantity,
          });
        }
      }
    }

    // Update object state
    gameObject.harvestCount += 1;
    gameObject.lastHarvestTime = Date.now();

    // Check if object should be depleted
    if (
      template.maxHarvests &&
      gameObject.harvestCount >= template.maxHarvests
    ) {
      if (template.respawnTime) {
        gameObject.isActive = false;
        gameObject.respawnTime = Date.now() + template.respawnTime * 1000;
        console.log(
          `${template.name} depleted, will respawn in ${template.respawnTime} seconds`
        );
      } else {
        // Permanently remove if no respawn time
        this.removeObject(objectId, "harvested");
        return { success: true, loot }; // Early return since object is removed
      }
    }

    return { success: true, loot };
  }

  // Remove a game object and notify nearby players
  removeObject(objectId: string, reason?: string): boolean {
    const gameObject = this.objects.get(objectId);
    if (!gameObject) {
      return false;
    }

    // Get the template for logging
    const template = this.templates.get(gameObject.templateId);

    // Remove the object from the world
    this.objects.delete(objectId);

    console.log(
      `${template?.name || "Unknown object"} removed from world (${reason || "unknown reason"})`
    );

    // Notify nearby players about the object removal
    const updateMessage: GameObjectUpdateMessage = {
      type: "GAME_OBJECT_UPDATE",
      timestamp: Date.now(),
      gameObjectId: objectId,
      action: "remove",
      reason: reason,
    };

    // Broadcast to nearby players only
    const notificationRange = 500; // pixels - adjust as needed
    this.world.playerManager.broadcastToNearbyPosition(
      gameObject.position,
      updateMessage,
      notificationRange
    );

    return true;
  }

  // Update game objects (handle respawning, etc.)
  update(deltaTime: number): void {
    const currentTime = Date.now();

    for (const [objectId, gameObject] of this.objects) {
      if (
        !gameObject.isActive &&
        gameObject.respawnTime &&
        currentTime >= gameObject.respawnTime
      ) {
        // Respawn object
        gameObject.isActive = true;
        gameObject.harvestCount = 0;
        gameObject.lastHarvestTime = undefined;
        gameObject.respawnTime = undefined;

        const template = this.templates.get(gameObject.templateId);
        if (template) {
          console.log(`${template.name} has respawned`);
        }
      }
    }
  }

  // Spawn world objects based on world size
  spawnWorldObjects(worldSize: { width: number; height: number }): void {
    const { width, height } = worldSize;

    // Clear existing objects
    this.objects.clear();
    this.nextObjectId = 1;

    // Spawn trees
    this.spawnTrees(width, height);

    // Spawn mining nodes
    this.spawnMiningNodes(width, height);

    // Spawn herbs
    this.spawnHerbs(width, height);

    console.log(`Spawned ${this.objects.size} world objects`);
  }

  private spawnTrees(width: number, height: number): void {
    // Spawn oak trees
    for (let i = 0; i < 20; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("oak_tree", x, y);
    }

    // Spawn pine trees
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("pine_tree", x, y);
    }

    // Spawn maple trees (rarer)
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("maple_tree", x, y);
    }
  }

  private spawnMiningNodes(width: number, height: number): void {
    // Spawn copper veins
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("copper_node", x, y);
    }

    // Spawn iron veins
    for (let i = 0; i < 8; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("iron_node", x, y);
    }
  }

  private spawnHerbs(width: number, height: number): void {
    // Spawn peacebloom
    for (let i = 0; i < 25; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("peacebloom", x, y);
    }

    // Spawn silverleaf
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      this.spawnObject("silverleaf", x, y);
    }
  }

  // Get world state for clients (active objects only)
  getWorldState(): Array<{
    id: string;
    templateId: string;
    position: Position;
    name: string;
    spriteId: string;
  }> {
    return this.getAllObjects().map((obj) => {
      const template = this.templates.get(obj.templateId);
      return {
        id: obj.id,
        templateId: obj.templateId,
        position: obj.position,
        name: template?.name || "Unknown Object",
        spriteId: template?.spriteId || "unknown",
      };
    });
  }
}
