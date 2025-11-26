// Client Input System
import { System, EntityId, Entity, Velocity } from "@shared/ecs";

export class InputSystem implements System {
  private keys: Set<string> = new Set();
  private mousePosition = { x: 0, y: 0 };
  private mouseButtons: Set<number> = new Set();
  private networkSystem?: any; // NetworkSystem - using any to avoid circular imports

  constructor(canvas: HTMLCanvasElement) {
    // Keyboard event listeners
    window.addEventListener("keydown", (e) => this.keys.add(e.code));
    window.addEventListener("keyup", (e) => this.keys.delete(e.code));

    // Mouse event listeners
    canvas.addEventListener("mousedown", (e) => {
      this.mouseButtons.add(e.button);
      this.updateMousePosition(e, canvas);
    });
    canvas.addEventListener("mouseup", (e) => {
      this.mouseButtons.delete(e.button);
      this.updateMousePosition(e, canvas);
    });
    canvas.addEventListener("mousemove", (e) => {
      this.updateMousePosition(e, canvas);
    });
  }

  // Set the network system to send input updates to
  setNetworkSystem(networkSystem: any) {
    this.networkSystem = networkSystem;
  }

  update(entities: Map<EntityId, Entity>, _deltaTime: number): void {
    // Calculate current input state
    const inputState = {
      up: this.keys.has("KeyW") || this.keys.has("ArrowUp"),
      down: this.keys.has("KeyS") || this.keys.has("ArrowDown"),
      left: this.keys.has("KeyA") || this.keys.has("ArrowLeft"),
      right: this.keys.has("KeyD") || this.keys.has("ArrowRight"),
    };

    // Send input state to network system
    if (this.networkSystem) {
      this.networkSystem.updateInputState(inputState);
    }

    // Find player entity (for now, assume first entity with position and velocity)
    const playerEntity = Array.from(entities.values()).find(
      (entity) =>
        entity.components.has("position") && entity.components.has("velocity")
    );

    if (playerEntity) {
      const velocity = playerEntity.components.get("velocity") as Velocity;
      const speed = 100; // pixels per second

      // Handle keyboard input
      let vx = 0;
      let vy = 0;

      if (inputState.up) vy -= 1;
      if (inputState.down) vy += 1;
      if (inputState.left) vx -= 1;
      if (inputState.right) vx += 1;

      // Normalize diagonal movement
      if (vx !== 0 && vy !== 0) {
        const length = Math.sqrt(vx * vx + vy * vy);
        vx /= length;
        vy /= length;
      }

      velocity.vx = vx * speed;
      velocity.vy = vy * speed;
    }
  }

  private updateMousePosition(
    event: MouseEvent,
    canvas: HTMLCanvasElement
  ): void {
    const rect = canvas.getBoundingClientRect();
    this.mousePosition.x = event.clientX - rect.left;
    this.mousePosition.y = event.clientY - rect.top;
  }

  getMousePosition(): { x: number; y: number } {
    return { ...this.mousePosition };
  }

  isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  isMouseButtonPressed(button: number): boolean {
    return this.mouseButtons.has(button);
  }
}
