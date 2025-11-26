// Server-side broadcast system for sending player positions to all clients
import { System } from '../../../shared/ecs'
import { WorldStateMessage } from '@shared/messages'
import { WebSocketServer } from '../net/websocketServer'

export class BroadcastSystem implements System {
  private lastBroadcastTime = 0
  private broadcastInterval = 100 // Send updates every 100ms (10 FPS)

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

    // Get all players and their current state
    const players = this.playerManager.getAllPlayers()

    // Only broadcast if there are players
    if (players.length === 0) return

    // Create world state message
    const worldStateMessage: WorldStateMessage = {
      type: 'WORLD_STATE',
      timestamp: currentTime,
      players
    }

    // Broadcast to all connected clients
    this.server.broadcast(worldStateMessage)
  }
}
