// Client Render System
import {
  System,
  EntityId,
  Entity,
  Position,
  Renderable,
  Player,
} from "@shared/ecs";

export class RenderSystem implements System {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraX: number = 0;
  private cameraY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  update(entities: Map<EntityId, Entity>, _deltaTime: number): void {
    // Update camera position based on player position
    this.updateCamera(entities);

    // Clear canvas and draw isometric grid background
    this.drawIsometricGrid();

    // Sort entities by render layer (lower layers first)
    const renderableEntities = Array.from(entities.values())
      .filter(
        (entity) =>
          entity.components.has("renderable") &&
          entity.components.has("position")
      )
      .sort((a, b) => {
        const renderA = a.components.get("renderable") as Renderable;
        const renderB = b.components.get("renderable") as Renderable;
        return renderA.layer - renderB.layer;
      });

    // Render each entity
    for (const entity of renderableEntities) {
      const position = entity.components.get("position") as Position;
      const renderable = entity.components.get("renderable") as Renderable;
      const player = entity.components.get("player") as Player | undefined;

      this.renderEntity(position, renderable, player);
    }
  }

  private updateCamera(entities: Map<EntityId, Entity>): void {
    // Find the local player
    const playerEntity = Array.from(entities.values()).find((entity) => {
      const player = entity.components.get("player") as Player;
      return player && player.isLocal;
    });

    if (!playerEntity) return;

    const playerPosition = playerEntity.components.get("position") as Position;
    if (!playerPosition) return;

    // Define screen boundaries - player should stay within these bounds
    const leftBoundary = 200;
    const rightBoundary = this.canvas.width - 200;
    const topBoundary = 200;
    const bottomBoundary = this.canvas.height - 200;

    // Calculate where the player appears on screen
    const screenX = playerPosition.x - this.cameraX;
    const screenY = playerPosition.y - this.cameraY;

    // Calculate target camera position to keep player within boundaries
    let targetCameraX = this.cameraX;
    let targetCameraY = this.cameraY;

    if (screenX < leftBoundary) {
      // Player is too far left, move camera left to bring player back to boundary
      targetCameraX = playerPosition.x - leftBoundary;
    } else if (screenX > rightBoundary) {
      // Player is too far right, move camera right to bring player back to boundary
      targetCameraX = playerPosition.x - rightBoundary;
    }

    if (screenY < topBoundary) {
      // Player is too far up, move camera up to bring player back to boundary
      targetCameraY = playerPosition.y - topBoundary;
    } else if (screenY > bottomBoundary) {
      // Player is too far down, move camera down to bring player back to boundary
      targetCameraY = playerPosition.y - bottomBoundary;
    }

    // Move camera towards target position instantly
    this.cameraX = targetCameraX;
    this.cameraY = targetCameraY;
  }

  private drawIsometricGrid(): void {
    this.ctx.save();

    // Apply camera transformation to the entire drawing context
    this.ctx.translate(-this.cameraX, -this.cameraY);

    // Clear canvas with background color (need to clear the entire visible area)
    this.ctx.fillStyle = "#2d5016"; // Dark green background
    const clearMargin = 200; // Extra margin to ensure we clear beyond visible area
    this.ctx.fillRect(
      this.cameraX - clearMargin,
      this.cameraY - clearMargin,
      this.canvas.width + clearMargin * 2,
      this.canvas.height + clearMargin * 2
    );

    // Set up grid drawing
    this.ctx.strokeStyle = "#22c55e"; // Bright green grid lines
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.8; // Very visible grid lines

    const tileWidth = 64; // Width of isometric tile
    const tileHeight = 32; // Height of isometric tile (half the width for proper isometric projection)

    // Draw isometric grid lines
    // First set: lines going from top-left to bottom-right (30-degree lines)
    this.ctx.beginPath();
    const slope1 = tileHeight / tileWidth; // slope for 30-degree lines

    // Vertical spacing for parallel lines
    const spacing1 = tileHeight * 2;

    for (let i = -10; i < 20; i++) {
      const yOffset = i * spacing1;
      this.ctx.moveTo(0, yOffset);
      this.ctx.lineTo(this.canvas.width, yOffset + this.canvas.width * slope1);
    }
    this.ctx.stroke();

    // Second set: lines going from top-right to bottom-left (-30-degree lines)
    this.ctx.beginPath();
    const slope2 = -slope1; // negative slope for the other direction

    for (let i = -10; i < 20; i++) {
      const yOffset = i * spacing1;
      this.ctx.moveTo(0, yOffset);
      this.ctx.lineTo(this.canvas.width, yOffset + this.canvas.width * slope2);
    }
    this.ctx.stroke();

    // Reset global alpha
    this.ctx.globalAlpha = 1.0;

    this.ctx.restore();
  }

  private renderEntity(
    position: Position,
    renderable: Renderable,
    player?: Player
  ): void {
    this.ctx.save();

    // Position is already in world coordinates, camera transformation is applied to entire context
    // Just apply entity-specific transformations
    this.ctx.translate(position.x, position.y);
    if (renderable.rotation) {
      this.ctx.rotate(renderable.rotation);
    }
    if (renderable.scale && renderable.scale !== 1) {
      this.ctx.scale(renderable.scale, renderable.scale);
    }

    // TODO: Implement actual sprite rendering
    // For now, draw a placeholder rectangle
    this.ctx.fillStyle = "#ff0000";
    this.ctx.fillRect(-16, -16, 32, 32);

    // Draw player name/ID above the character
    if (player) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 2;
      this.ctx.font = "12px Arial";
      this.ctx.textAlign = "center";

      // Display player ID truncated to first 8 characters
      const displayName = player.id.substring(0, 8);
      this.ctx.strokeText(displayName, 0, -25);
      this.ctx.fillText(displayName, 0, -25);
    }

    this.ctx.restore();
  }
}
