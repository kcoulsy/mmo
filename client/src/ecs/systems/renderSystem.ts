// Client Render System
import { System, EntityId, Entity, Position, Renderable, Player } from "@shared/ecs";

export class RenderSystem implements System {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
  }

  update(entities: Map<EntityId, Entity>, _deltaTime: number): void {
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

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

  private renderEntity(position: Position, renderable: Renderable, player?: Player): void {
    this.ctx.save();

    // Apply transformations
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
