// Shared ECS types and utilities
export * from './components'
export * from './entity'

// Entity ID type
export type EntityId = string

// Component base interface
export interface Component {
  readonly type: string
}

// System interface
export interface System {
  update(entities: Map<EntityId, any>, deltaTime: number): void
}

// World interface
export interface World {
  createEntity(): EntityId
  destroyEntity(entityId: EntityId): void
  addComponent<T extends Component>(entityId: EntityId, component: T): void
  removeComponent(entityId: EntityId, componentType: string): void
  getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined
  hasComponent(entityId: EntityId, componentType: string): boolean
  getEntitiesWithComponent(componentType: string): EntityId[]
  update(deltaTime: number): void
}
