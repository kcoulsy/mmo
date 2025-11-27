// Client Render System
import {
  System,
  EntityId,
  Entity,
  Position,
  Renderable,
  Player,
  GameObject,
} from "@shared/ecs";

export class RenderSystem implements System {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cameraX: number = 0;
  private cameraY: number = 0;
  private lastLogTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  getCameraPosition(): { x: number; y: number } {
    return { x: this.cameraX, y: this.cameraY };
  }

  update(entities: Map<EntityId, Entity>, _deltaTime: number): void {
    // Update camera position based on player position
    this.updateCamera(entities);

    // Apply camera transformation to the entire rendering context
    this.ctx.save();
    this.ctx.translate(-this.cameraX, -this.cameraY);

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
      const gameObject = entity.components.get("gameObject") as
        | GameObject
        | undefined;

      // Debug logging for game objects
      this.renderEntity(position, renderable, player, gameObject);
    }

    // Restore the camera transformation
    this.ctx.restore();
  }

  private updateCamera(entities: Map<EntityId, Entity>): void {
    // Find the local player
    const playerEntity = Array.from(entities.values()).find((entity) => {
      const player = entity.components.get("player") as Player;
      return player && player.isLocal;
    });

    if (!playerEntity) {
      return;
    }

    const playerPosition = playerEntity.components.get("position") as Position;
    if (!playerPosition) {
      return;
    }

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
    // Clear canvas with background color (camera transform already applied at higher level)
    this.ctx.fillStyle = "#2d5016"; // Dark green background
    const clearMargin = 200; // Extra margin to ensure we clear beyond visible area
    this.ctx.fillRect(
      -clearMargin,
      -clearMargin,
      this.canvas.width + clearMargin * 2,
      this.canvas.height + clearMargin * 2
    );

    // Set up grid drawing
    this.ctx.strokeStyle = "#22c55e"; // Bright green grid lines
    this.ctx.lineWidth = 2;
    this.ctx.globalAlpha = 0.8; // Very visible grid lines

    const tileWidth = 64; // Width of isometric tile
    const tileHeight = 32; // Height of isometric tile (half the width for proper isometric projection)

    // Grid bounds are handled by the camera transform applied at higher level

    // Draw isometric grid lines
    // First set: lines going from top-left to bottom-right (30-degree lines)
    this.ctx.beginPath();
    const slope1 = tileHeight / tileWidth; // slope for 30-degree lines

    // Vertical spacing for parallel lines
    const spacing1 = tileHeight * 2;

    // Draw lines that intersect the visible area
    for (let i = -20; i < 40; i++) {
      const yOffset = i * spacing1;
      // Find intersection points with the screen boundaries
      const leftY = yOffset;
      const rightY = yOffset + this.canvas.width * slope1;

      // Only draw if the line intersects the visible area
      if (leftY <= this.canvas.height || rightY >= 0) {
        this.ctx.moveTo(0, yOffset);
        this.ctx.lineTo(this.canvas.width, rightY);
      }
    }
    this.ctx.stroke();

    // Second set: lines going from top-right to bottom-left (-30-degree lines)
    this.ctx.beginPath();
    const slope2 = -slope1; // negative slope for the other direction

    for (let i = -20; i < 40; i++) {
      const yOffset = i * spacing1;
      const rightY = yOffset + this.canvas.width * slope2;

      // Only draw if the line intersects the visible area
      if (yOffset <= this.canvas.height || rightY >= 0) {
        this.ctx.moveTo(0, yOffset);
        this.ctx.lineTo(this.canvas.width, rightY);
      }
    }
    this.ctx.stroke();

    // Reset global alpha
    this.ctx.globalAlpha = 1.0;
  }

  private renderEntity(
    position: Position,
    renderable: Renderable,
    player?: Player,
    gameObject?: GameObject
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
    if (gameObject) {
      // GameObjects: green boxes for harvestable, gray for non-harvestable
      if (gameObject.harvestable) {
        this.ctx.fillStyle = "#00ff00";
        this.ctx.strokeStyle = "#008800";
      } else {
        this.ctx.fillStyle = "#666666";
        this.ctx.strokeStyle = "#444444";
      }
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(-20, -20, 40, 40);
      this.ctx.fillRect(-20, -20, 40, 40);

      // Add a small indicator for harvestable objects
      if (gameObject.harvestable) {
        this.ctx.fillStyle = "#ffff00";
        this.ctx.beginPath();
        this.ctx.arc(15, -15, 3, 0, 2 * Math.PI);
        this.ctx.fill();
      }
    } else {
      // Players: colored boxes based on local/remote
      if (player?.isLocal) {
        this.ctx.fillStyle = "#3b82f6"; // Blue for local player
        this.ctx.strokeStyle = "#1e40af";
      } else {
        this.ctx.fillStyle = "#ef4444"; // Red for remote players
        this.ctx.strokeStyle = "#dc2626";
      }
      this.ctx.lineWidth = 2;
      this.ctx.fillRect(-16, -16, 32, 32);
      this.ctx.strokeRect(-16, -16, 32, 32);
    }

    // Draw name above the entity
    if (player || gameObject) {
      this.ctx.fillStyle = "#ffffff";
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 2;
      this.ctx.font = "12px Arial";
      this.ctx.textAlign = "center";

      let displayName = "";
      if (player) {
        // Display player name (fallback to ID if name not available)
        displayName = (player.name || player.id).substring(0, 8);
      } else if (gameObject) {
        // Display GameObject name
        displayName = gameObject.name.substring(0, 12);
      }

      this.ctx.strokeText(displayName, 0, -25);
      this.ctx.fillText(displayName, 0, -25);
    }

    this.ctx.restore();
  }
}
