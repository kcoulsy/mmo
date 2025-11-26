// Server-side ECS World implementation
import { World, EntityId, Component, System, Entity } from '@shared/ecs'

export class ServerWorld implements World {
  private entities: Map<EntityId, Entity> = new Map()
  private systems: System[] = []
  private nextEntityId = 0

  createEntity(): EntityId {
    const id = `server_entity_${this.nextEntityId++}`
    this.entities.set(id, {
      id,
      components: new Map()
    })
    return id
  }

  destroyEntity(entityId: EntityId): void {
    this.entities.delete(entityId)
  }

  addComponent<T extends Component>(entityId: EntityId, component: T): void {
    const entity = this.entities.get(entityId)
    if (entity) {
      entity.components.set(component.type, component)
    }
  }

  removeComponent(entityId: EntityId, componentType: string): void {
    const entity = this.entities.get(entityId)
    if (entity) {
      entity.components.delete(componentType)
    }
  }

  getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined {
    const entity = this.entities.get(entityId)
    return entity?.components.get(componentType) as T | undefined
  }

  hasComponent(entityId: EntityId, componentType: string): boolean {
    const entity = this.entities.get(entityId)
    return entity?.components.has(componentType) ?? false
  }

  getEntitiesWithComponent(componentType: string): EntityId[] {
    const result: EntityId[] = []
    for (const [id, entity] of this.entities) {
      if (entity.components.has(componentType)) {
        result.push(id)
      }
    }
    return result
  }

  addSystem(system: System): void {
    this.systems.push(system)
  }

  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(this.entities, deltaTime)
    }
  }

  getEntity(entityId: EntityId): Entity | undefined {
    return this.entities.get(entityId)
  }

  getAllEntities(): EntityId[] {
    return Array.from(this.entities.keys())
  }

  // Server-specific methods
  getEntitiesForSync(): Array<{ id: EntityId; components: Component[] }> {
    const result: Array<{ id: EntityId; components: Component[] }> = []
    for (const [id, entity] of this.entities) {
      // Only sync entities with position (for now)
      if (entity.components.has('position')) {
        result.push({
          id,
          components: Array.from(entity.components.values())
        })
      }
    }
    return result
  }
}
