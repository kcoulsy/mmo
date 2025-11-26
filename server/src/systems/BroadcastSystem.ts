// Server-side broadcast system for sending player movements to clients
import { System } from '../../../shared/ecs'
import { PlayerMoveMessage } from '@shared/messages'
import { WebSocketServer } from '../net/websocketServer'

export class BroadcastSystem implements System {
  private lastBroadcastTime = 0
  private broadcastInterval = 50 // Send updates every 50ms (20 FPS)
  private lastPlayerStates = new Map<string, { x: number; y: number; vx: number; vy: number }>()

  constructor(
    private server: WebSocketServer,
    private playerManager: any // PlayerManager - using any to avoid circular imports
  ) {}

  update(entities: Map<string, any>, deltaTime: number): void {
    const currentTime = Date.now()

    // Only broadcast periodically
    if (currentTime - this.lastBroadcastTime < this.broadcastInterval) {
      return
    }

    this.lastBroadcastTime = currentTime

    // Get all players and send individual movement updates
    const players = this.playerManager.getAllPlayers()

    // Send movement updates for players that have moved
    for (const player of players) {
      const entityId = this.playerManager.playerEntities.get(player.id)
      if (!entityId) continue

      const position = entities.get(entityId)?.components.get('position')
      const velocity = entities.get(entityId)?.components.get('velocity')

      if (!position) continue

      // Check if player position/velocity changed since last broadcast
      const lastState = this.lastPlayerStates.get(player.id)
      const currentState = {
        x: Math.round(position.x * 100) / 100, // Round to 2 decimal places
        y: Math.round(position.y * 100) / 100,
        vx: velocity ? Math.round(velocity.vx * 100) / 100 : 0,
        vy: velocity ? Math.round(velocity.vy * 100) / 100 : 0
      }

      // Only send update if position or velocity changed significantly
      const hasChanged = !lastState ||
        Math.abs(lastState.x - currentState.x) > 0.001 ||
        Math.abs(lastState.y - currentState.y) > 0.001 ||
        Math.abs(lastState.vx - currentState.vx) > 0.001 ||
        Math.abs(lastState.vy - currentState.vy) > 0.001

      if (hasChanged) {
        const moveMessage: PlayerMoveMessage = {
          type: 'PLAYER_MOVE',
          timestamp: currentTime,
          playerId: player.id,
          position: { x: position.x, y: position.y, z: position.z || 0 },
          velocity: velocity ? { vx: velocity.vx, vy: velocity.vy } : undefined
        }

        // Broadcast to all clients except the player who moved (they already know)
        this.server.broadcast(moveMessage, player.id)

        // Update last known state
        this.lastPlayerStates.set(player.id, currentState)
      }
    }
  }
}
