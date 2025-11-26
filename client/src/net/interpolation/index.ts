// Client-side interpolation system for smooth remote player movement
import { System } from '../../../../shared/ecs'
import { EntityId } from '../../../../shared/ecs'
import { Position, Velocity, Player } from '@shared/ecs/components'

interface InterpolatedPosition {
  current: { x: number; y: number; z: number }
  target: { x: number; y: number; z: number }
  startTime: number
  duration: number
}

export class InterpolationSystem implements System {
  private interpolatedPositions: Map<EntityId, InterpolatedPosition> = new Map()
  private interpolationTime = 100 // Interpolate over 100ms

  update(entities: Map<EntityId, any>, deltaTime: number): void {
    const currentTime = Date.now()

    for (const [entityId, entity] of entities) {
      const player = entity.components.get('player') as Player
      const position = entity.components.get('position') as Position

      // Only interpolate remote players
      if (!player || player.isLocal) continue

      const interpolation = this.interpolatedPositions.get(entityId)
      if (interpolation) {
        const elapsed = currentTime - interpolation.startTime
        const progress = Math.min(elapsed / interpolation.duration, 1)

        // Linear interpolation between current and target
        position.x = interpolation.current.x + (interpolation.target.x - interpolation.current.x) * progress
        position.y = interpolation.current.y + (interpolation.target.y - interpolation.current.y) * progress
        position.z = interpolation.current.z + (interpolation.target.z - interpolation.current.z) * progress

        // Remove completed interpolations
        if (progress >= 1) {
          this.interpolatedPositions.delete(entityId)
        }
      }
    }
  }

  // Update target position for interpolation
  updateTargetPosition(entityId: EntityId, targetPosition: { x: number; y: number; z: number }) {
    const currentInterpolation = this.interpolatedPositions.get(entityId)

    if (currentInterpolation) {
      // Update existing interpolation
      currentInterpolation.target = targetPosition
      currentInterpolation.startTime = Date.now()
    } else {
      // Create new interpolation from current position
      // We'll need to get the current position from the world
      // For now, assume we start from the current position
      const startPosition = targetPosition // This will be fixed when we integrate

      this.interpolatedPositions.set(entityId, {
        current: startPosition,
        target: targetPosition,
        startTime: Date.now(),
        duration: this.interpolationTime
      })
    }
  }

  // Set interpolation time (how long to interpolate between positions)
  setInterpolationTime(timeMs: number) {
    this.interpolationTime = timeMs
  }

  // Clear interpolation for an entity (useful when teleporting)
  clearInterpolation(entityId: EntityId) {
    this.interpolatedPositions.delete(entityId)
  }

  // Clear all interpolations
  clearAllInterpolations() {
    this.interpolatedPositions.clear()
  }
}
