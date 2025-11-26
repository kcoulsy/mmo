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
  private velocityPredictions: Map<EntityId, { vx: number; vy: number; lastUpdate: number }> = new Map()

  update(entities: Map<EntityId, any>, deltaTime: number): void {
    const currentTime = Date.now()

    // Only process entities that have player components (optimization)
    for (const [entityId, entity] of entities) {
      const player = entity.components.get('player') as Player
      if (!player || player.isLocal) continue

      const position = entity.components.get('position') as Position
      const velocity = entity.components.get('velocity') as any

      // Check if we have velocity prediction
      const velocityPrediction = this.velocityPredictions.get(entityId)
      if (velocityPrediction && velocity) {
        // Use velocity-based prediction between server updates
        const timeSinceUpdate = currentTime - velocityPrediction.lastUpdate
        const maxPredictionTime = 200 // Max prediction time before falling back to interpolation

        if (timeSinceUpdate < maxPredictionTime) {
          // Predict position based on velocity
          position.x += velocityPrediction.vx * deltaTime
          position.y += velocityPrediction.vy * deltaTime
          continue
        }
      }

      // Fall back to interpolation if no velocity prediction or prediction timed out
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
  updateTargetPosition(entityId: EntityId, targetPosition: { x: number; y: number; z: number }, velocity?: { vx: number; vy: number }, currentPosition?: { x: number; y: number; z: number }) {
    // Store velocity prediction if provided
    if (velocity) {
      this.velocityPredictions.set(entityId, {
        vx: velocity.vx,
        vy: velocity.vy,
        lastUpdate: Date.now()
      })
    }

    // Get current position for interpolation start
    const currentInterpolation = this.interpolatedPositions.get(entityId)
    let startPosition = currentPosition || targetPosition

    // If we have an ongoing interpolation, start from its current position
    if (currentInterpolation && !currentPosition) {
      startPosition = { ...currentInterpolation.current }
    }

    this.interpolatedPositions.set(entityId, {
      current: startPosition,
      target: targetPosition,
      startTime: Date.now(),
      duration: this.interpolationTime
    })
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
