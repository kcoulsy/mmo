// Client Movement System
import { System, EntityId, Entity, Position, Velocity } from '@shared/ecs'

export class MovementSystem implements System {
  update(entities: Map<EntityId, Entity>, deltaTime: number): void {
    for (const entity of entities.values()) {
      const position = entity.components.get('position') as Position | undefined
      const velocity = entity.components.get('velocity') as Velocity | undefined

      if (position && velocity) {
        // Update position based on velocity
        position.x += velocity.vx * deltaTime
        position.y += velocity.vy * deltaTime
      }
    }
  }
}
