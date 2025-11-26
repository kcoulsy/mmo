// Server Movement System
import { System, EntityId, Entity, Position, Velocity, Player } from '@shared/ecs'

export class MovementSystem implements System {
  // World boundaries
  private worldWidth = 800
  private worldHeight = 600
  private playerManager?: any // PlayerManager for sending corrections

  constructor(playerManager?: any) {
    this.playerManager = playerManager
  }

  update(entities: Map<EntityId, Entity>, deltaTime: number): void {
    for (const entity of entities.values()) {
      const position = entity.components.get('position') as Position | undefined
      const velocity = entity.components.get('velocity') as Velocity | undefined
      const player = entity.components.get('player') as Player | undefined

      if (position && velocity) {
        // Store old position for validation
        const oldX = position.x
        const oldY = position.y

        // Update position based on velocity
        position.x += velocity.vx * deltaTime
        position.y += velocity.vy * deltaTime

        // Validate movement and send corrections if invalid
        if (!this.validateMovement(position, oldX, oldY, player)) {
          // Revert invalid movement
          position.x = oldX
          position.y = oldY

          // Stop velocity if movement is blocked
          velocity.vx = 0
          velocity.vy = 0

          // Send position correction to client
          if (player && this.playerManager) {
            this.playerManager.sendPositionCorrectionToPlayer(player.id, position)
          }
        }
      }
    }
  }

  private validateMovement(position: Position, oldX: number, oldY: number, player?: Player): boolean {
    // Boundary checking
    if (position.x < 0 || position.x >= this.worldWidth ||
        position.y < 0 || position.y >= this.worldHeight) {
      return false
    }

    // TODO: Add collision detection with other entities
    // TODO: Add navmesh validation for complex terrain
    // TODO: Add line-of-sight validation for teleportation prevention

    // For now, allow all movement within bounds
    return true
  }
}
