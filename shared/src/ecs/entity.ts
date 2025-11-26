// Entity utilities
import { EntityId, Component } from './index'

// Entity data structure
export interface Entity {
  id: EntityId
  components: Map<string, Component>
}

// Entity creation utilities
export function createEntity(id: EntityId): Entity {
  return {
    id,
    components: new Map()
  }
}

export function addComponentToEntity(entity: Entity, component: Component): void {
  entity.components.set(component.type, component)
}

export function removeComponentFromEntity(entity: Entity, componentType: string): void {
  entity.components.delete(componentType)
}

export function getComponentFromEntity<T extends Component>(
  entity: Entity,
  componentType: string
): T | undefined {
  return entity.components.get(componentType) as T | undefined
}

export function hasComponent(entity: Entity, componentType: string): boolean {
  return entity.components.has(componentType)
}
