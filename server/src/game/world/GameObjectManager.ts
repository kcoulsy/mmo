// GameObject Manager - Manages game objects like trees, mining nodes, herbs
export interface GameObjectTemplate {
  objectType: string;
  subtype?: string;
  name: string;
  spriteId: string;
  requiredSkill?: string;
  requiredLevel?: number;
  respawnTime?: number;
  maxHarvests: number;
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
  position: { x: number; y: number; z?: number };
  currentHarvests: number;
  lastHarvested?: number;
  isDepleted: boolean;
}

export class GameObjectManager {
  private gameObjects: Map<string, GameObject> = new Map();
  private templates: Map<string, GameObjectTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Tree templates
    this.templates.set("oak_tree", {
      objectType: "tree",
      subtype: "oak",
      name: "Oak Tree",
      spriteId: "tree_oak",
      requiredSkill: "Woodcutting",
      // requiredLevel: 0, // Basic resources don't require skill levels
      respawnTime: 300, // 5 minutes
      maxHarvests: 10,
      collider: { shape: "circle", radius: 32 },
    });

    this.templates.set("pine_tree", {
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
      objectType: "mining_node",
      subtype: "copper",
      name: "Copper Vein",
      spriteId: "mining_copper",
      requiredSkill: "Mining",
      // requiredLevel: 0, // Basic resources don't require skill levels
      respawnTime: 480, // 8 minutes
      maxHarvests: 5,
      collider: { shape: "circle", radius: 24 },
    });

    this.templates.set("iron_node", {
      objectType: "mining_node",
      subtype: "iron",
      name: "Iron Vein",
      spriteId: "mining_iron",
      requiredSkill: "Mining",
      requiredLevel: 10,
      respawnTime: 600, // 10 minutes
      maxHarvests: 4,
      collider: { shape: "circle", radius: 24 },
    });

    // Herb templates
    this.templates.set("peacebloom", {
      objectType: "herb",
      subtype: "peacebloom",
      name: "Peacebloom",
      spriteId: "herb_peacebloom",
      requiredSkill: "Herbalism",
      // requiredLevel: 0, // Basic resources don't require skill levels
      respawnTime: 240, // 4 minutes
      maxHarvests: 3,
      collider: { shape: "circle", radius: 16 },
    });

    this.templates.set("silverleaf", {
      objectType: "herb",
      subtype: "silverleaf",
      name: "Silverleaf",
      spriteId: "herb_silverleaf",
      requiredSkill: "Herbalism",
      requiredLevel: 5,
      respawnTime: 300, // 5 minutes
      maxHarvests: 2,
      collider: { shape: "circle", radius: 16 },
    });
  }

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

    const id = `gameobject_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const gameObject: GameObject = {
      id,
      templateId,
      position: { x, y, z },
      currentHarvests: template.maxHarvests,
      isDepleted: false,
    };

    this.gameObjects.set(id, gameObject);
    console.log(`Spawned ${template.name} at (${x}, ${y})`);
    return id;
  }

  getGameObject(id: string): GameObject | undefined {
    return this.gameObjects.get(id);
  }

  getGameObjectTemplate(templateId: string): GameObjectTemplate | undefined {
    return this.templates.get(templateId);
  }

  harvestObject(id: string): boolean {
    const gameObject = this.gameObjects.get(id);
    if (!gameObject || gameObject.isDepleted) {
      return false;
    }

    gameObject.currentHarvests--;
    gameObject.lastHarvested = Date.now();

    if (gameObject.currentHarvests <= 0) {
      gameObject.isDepleted = true;
      console.log(`GameObject ${id} depleted`);
    }

    return true;
  }

  update(deltaTime: number): void {
    const now = Date.now();

    // Respawn depleted objects
    for (const gameObject of this.gameObjects.values()) {
      if (gameObject.isDepleted && gameObject.lastHarvested) {
        const template = this.templates.get(gameObject.templateId);
        if (template && template.respawnTime) {
          const timeSinceHarvest = (now - gameObject.lastHarvested) / 1000; // Convert to seconds
          if (timeSinceHarvest >= template.respawnTime) {
            // Respawn the object
            gameObject.currentHarvests = template.maxHarvests;
            gameObject.isDepleted = false;
            gameObject.lastHarvested = undefined;
            console.log(
              `Respawned ${gameObject.templateId} (${gameObject.id})`
            );
          }
        }
      }
    }
  }

  spawnWorldObjects(worldSize: { width: number; height: number }): void {
    console.log("Spawning world GameObjects...");

    // Spawn trees (most common)
    this.spawnRandomObjects(
      ["oak_tree", "pine_tree", "maple_tree"],
      50,
      worldSize
    );

    // Spawn mining nodes (less common)
    this.spawnRandomObjects(["copper_node", "iron_node"], 20, worldSize);

    // Spawn herbs (moderately common)
    this.spawnRandomObjects(["peacebloom", "silverleaf"], 30, worldSize);

    console.log("World GameObject spawning complete");
  }

  private spawnRandomObjects(
    templateIds: string[],
    count: number,
    worldSize: { width: number; height: number }
  ): void {
    for (let i = 0; i < count; i++) {
      const templateId =
        templateIds[Math.floor(Math.random() * templateIds.length)];
      const x = Math.random() * worldSize.width;
      const y = Math.random() * worldSize.height;

      this.spawnObject(templateId, x, y);
    }

    console.log(
      `Spawned ${count} random ${templateIds[0].split("_")[1]} objects`
    );
  }

  getAllGameObjects(): GameObject[] {
    return Array.from(this.gameObjects.values());
  }

  getHarvestableObjects(): GameObject[] {
    return Array.from(this.gameObjects.values()).filter(
      (obj) => !obj.isDepleted
    );
  }

  // Get objects within range for distance-based operations
  getObjectsInRange(
    centerX: number,
    centerY: number,
    range: number
  ): GameObject[] {
    const result: GameObject[] = [];

    for (const obj of this.gameObjects.values()) {
      if (obj.isDepleted) continue;

      const dx = obj.position.x - centerX;
      const dy = obj.position.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= range) {
        result.push(obj);
      }
    }

    return result;
  }
}
