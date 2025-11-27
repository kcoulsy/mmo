import { Player } from "./player";

// Movement system for handling player movement logic
export class MovementSystem {
  // World boundaries
  private worldWidth = 800;
  private worldHeight = 600;
  private playerManager?: any; // PlayerManager reference for sending corrections

  constructor(playerManager?: any) {
    this.playerManager = playerManager;
  }

  // Update player positions based on velocity
  updatePlayerPositions(players: Player[], deltaTime: number): void {
    for (const player of players) {
      const oldX = player.position.x;
      const oldY = player.position.y;

      // Update position based on velocity
      player.position.x += player.velocity.vx * deltaTime;
      player.position.y += player.velocity.vy * deltaTime;

      // Validate movement and send corrections if invalid
      if (!this.validateMovement(player)) {
        // Revert invalid movement
        player.position.x = oldX;
        player.position.y = oldY;

        // Stop velocity if movement is blocked
        player.velocity.vx = 0;
        player.velocity.vy = 0;

        // Send position correction to client
        if (this.playerManager) {
          this.playerManager.sendPositionCorrectionToPlayer(
            player.id,
            player.position
          );
        }
      }
    }
  }

  // Handle player input and calculate velocity
  handlePlayerInput(
    player: Player,
    input: { up: boolean; down: boolean; left: boolean; right: boolean }
  ): void {
    const speed = player.stats.moveSpeed;

    // Calculate velocity based on input
    let vx = 0;
    let vy = 0;

    if (input.up) vy -= 1;
    if (input.down) vy += 1;
    if (input.left) vx -= 1;
    if (input.right) vx += 1;

    // Normalize diagonal movement
    if (vx !== 0 && vy !== 0) {
      const length = Math.sqrt(vx * vx + vy * vy);
      vx /= length;
      vy /= length;
    }

    player.setVelocity(vx * speed, vy * speed);
  }

  // Validate movement against world boundaries and obstacles
  private validateMovement(player: Player): boolean {
    // Boundary checking
    if (
      player.position.x < 0 ||
      player.position.x >= this.worldWidth ||
      player.position.y < 0 ||
      player.position.y >= this.worldHeight
    ) {
      return false;
    }

    // TODO: Add collision detection with other entities
    // TODO: Add navmesh validation for complex terrain
    // TODO: Add line-of-sight validation for teleportation prevention

    // For now, allow all movement within bounds
    return true;
  }

  // Check if two positions are within a certain distance
  static isWithinDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number },
    distance: number
  ): boolean {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy) <= distance;
  }

  // Get distance between two positions
  static getDistance(
    pos1: { x: number; y: number },
    pos2: { x: number; y: number }
  ): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}
