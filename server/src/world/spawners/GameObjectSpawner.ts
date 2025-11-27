// GameObject Spawner System
import { ServerWorld } from "../../ecs/world";
import { GameObject, Position, Renderable, Collider } from "../../../../shared/src/ecs/components";

export interface GameObjectTemplate {
  objectType: GameObject['objectType'];
  subtype?: string;
  name: string;
  spriteId: string;
  requiredSkill?: string;
  requiredLevel?: number;
  respawnTime?: number;
  maxHarvests?: number;
  collider?: {
    shape: 'circle' | 'rectangle';
    radius?: number;
    width?: number;
    height?: number;
  };
}

export class GameObjectSpawner {
  private world: ServerWorld;
  private templates: Map<string, GameObjectTemplate> = new Map();

  constructor(world: ServerWorld) {
    this.world = world;
    this.initializeTemplates();
  }

  private initializeTemplates() {
    // Tree templates
    this.templates.set('oak_tree', {
      objectType: 'tree',
      subtype: 'oak',
      name: 'Oak Tree',
      spriteId: 'tree_oak',
      requiredSkill: 'Woodcutting',
      requiredLevel: 1,
      respawnTime: 300, // 5 minutes
      maxHarvests: 10,
      collider: { shape: 'circle', radius: 32 }
    });

    this.templates.set('pine_tree', {
      objectType: 'tree',
      subtype: 'pine',
      name: 'Pine Tree',
      spriteId: 'tree_pine',
      requiredSkill: 'Woodcutting',
      requiredLevel: 5,
      respawnTime: 300,
      maxHarvests: 8,
      collider: { shape: 'circle', radius: 28 }
    });

    this.templates.set('maple_tree', {
      objectType: 'tree',
      subtype: 'maple',
      name: 'Maple Tree',
      spriteId: 'tree_maple',
      requiredSkill: 'Woodcutting',
      requiredLevel: 15,
      respawnTime: 600, // 10 minutes
      maxHarvests: 6,
      collider: { shape: 'circle', radius: 30 }
    });

    // Mining node templates
    this.templates.set('copper_node', {
      objectType: 'mining_node',
      subtype: 'copper',
      name: 'Copper Vein',
      spriteId: 'mining_copper',
      requiredSkill: 'Mining',
      requiredLevel: 1,
      respawnTime: 480, // 8 minutes
      maxHarvests: 5,
      collider: { shape: 'circle', radius: 24 }
    });

    this.templates.set('iron_node', {
      objectType: 'mining_node',
      subtype: 'iron',
      name: 'Iron Vein',
      spriteId: 'mining_iron',
      requiredSkill: 'Mining',
      requiredLevel: 10,
      respawnTime: 600, // 10 minutes
      maxHarvests: 4,
      collider: { shape: 'circle', radius: 24 }
    });

    // Herb templates
    this.templates.set('peacebloom', {
      objectType: 'herb',
      subtype: 'peacebloom',
      name: 'Peacebloom',
      spriteId: 'herb_peacebloom',
      requiredSkill: 'Herbalism',
      requiredLevel: 1,
      respawnTime: 240, // 4 minutes
      maxHarvests: 3,
      collider: { shape: 'circle', radius: 16 }
    });

    this.templates.set('silverleaf', {
      objectType: 'herb',
      subtype: 'silverleaf',
      name: 'Silverleaf',
      spriteId: 'herb_silverleaf',
      requiredSkill: 'Herbalism',
      requiredLevel: 5,
      respawnTime: 300, // 5 minutes
      maxHarvests: 2,
      collider: { shape: 'circle', radius: 16 }
    });
  }

  spawnObject(templateId: string, x: number, y: number, z: number = 0): string | null {
    const template = this.templates.get(templateId);
    if (!template) {
      console.warn(`Unknown GameObject template: ${templateId}`);
      return null;
    }

    const entityId = this.world.createEntity();

    // Add position component
    this.world.addComponent(entityId, {
      type: 'position',
      x,
      y,
      z
    } as Position);

    // Add renderable component
    this.world.addComponent(entityId, {
      type: 'renderable',
      spriteId: template.spriteId,
      layer: 1,
      frame: 0
    } as Renderable);

    // Add collider component if specified
    if (template.collider) {
      this.world.addComponent(entityId, {
        type: 'collider',
        shape: template.collider.shape,
        radius: template.collider.radius,
        width: template.collider.width,
        height: template.collider.height
      } as Collider);
    }

    // Add GameObject component
    this.world.addComponent(entityId, {
      type: 'gameObject',
      objectType: template.objectType,
      subtype: template.subtype,
      name: template.name,
      interactable: true,
      harvestable: true,
      requiredSkill: template.requiredSkill,
      requiredLevel: template.requiredLevel,
      respawnTime: template.respawnTime,
      maxHarvests: template.maxHarvests,
      currentHarvests: template.maxHarvests
    } as GameObject);

    console.log(`Spawned ${template.name} at (${x}, ${y})`);
    return entityId;
  }

  spawnRandomTrees(count: number, worldSize: { width: number; height: number }) {
    const treeTemplates = ['oak_tree', 'pine_tree', 'maple_tree'];
    const spawnedTrees: string[] = [];

    for (let i = 0; i < count; i++) {
      const templateId = treeTemplates[Math.floor(Math.random() * treeTemplates.length)];
      const x = Math.random() * worldSize.width;
      const y = Math.random() * worldSize.height;

      const entityId = this.spawnObject(templateId, x, y);
      if (entityId) {
        spawnedTrees.push(entityId);
      }
    }

    console.log(`Spawned ${spawnedTrees.length} random trees`);
    return spawnedTrees;
  }

  spawnRandomMiningNodes(count: number, worldSize: { width: number; height: number }) {
    const miningTemplates = ['copper_node', 'iron_node'];
    const spawnedNodes: string[] = [];

    for (let i = 0; i < count; i++) {
      const templateId = miningTemplates[Math.floor(Math.random() * miningTemplates.length)];
      const x = Math.random() * worldSize.width;
      const y = Math.random() * worldSize.height;

      const entityId = this.spawnObject(templateId, x, y);
      if (entityId) {
        spawnedNodes.push(entityId);
      }
    }

    console.log(`Spawned ${spawnedNodes.length} random mining nodes`);
    return spawnedNodes;
  }

  spawnRandomHerbs(count: number, worldSize: { width: number; height: number }) {
    const herbTemplates = ['peacebloom', 'silverleaf'];
    const spawnedHerbs: string[] = [];

    for (let i = 0; i < count; i++) {
      const templateId = herbTemplates[Math.floor(Math.random() * herbTemplates.length)];
      const x = Math.random() * worldSize.width;
      const y = Math.random() * worldSize.height;

      const entityId = this.spawnObject(templateId, x, y);
      if (entityId) {
        spawnedHerbs.push(entityId);
      }
    }

    console.log(`Spawned ${spawnedHerbs.length} random herbs`);
    return spawnedHerbs;
  }

  spawnWorldObjects(worldSize: { width: number; height: number }) {
    console.log('Spawning world GameObjects...');

    // Spawn trees (most common)
    this.spawnRandomTrees(50, worldSize);

    // Spawn mining nodes (less common)
    this.spawnRandomMiningNodes(20, worldSize);

    // Spawn herbs (moderately common)
    this.spawnRandomHerbs(30, worldSize);

    console.log('World GameObject spawning complete');
  }
}
