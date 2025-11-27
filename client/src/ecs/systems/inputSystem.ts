// Client Input System
import {
  System,
  EntityId,
  Entity,
  Velocity,
  Position,
  Renderable,
} from "@shared/ecs";
import { useKeybindStore, useUIStore } from "../../stores";

export class InputSystem implements System {
  private keys: Set<string> = new Set();
  private mousePosition = { x: 0, y: 0 };
  private mouseButtons: Set<number> = new Set();
  private networkSystem?: any; // NetworkSystem - using any to avoid circular imports
  private renderSystem?: any; // RenderSystem - for camera position
  private onToggleGameMenu?: () => void;
  private canvas: HTMLCanvasElement;
  private keydownHandler: (e: KeyboardEvent) => void;
  private keyupHandler: (e: KeyboardEvent) => void;
  private mousedownHandler: (e: MouseEvent) => void;
  private mouseupHandler: (e: MouseEvent) => void;
  private clickHandler: (e: MouseEvent) => void;
  private contextmenuHandler: (e: MouseEvent) => void;
  private mousemoveHandler: (e: MouseEvent) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Create event handlers
    this.keydownHandler = (e) => {
      this.keys.add(e.code);

      // Handle keybind actions (prevent default if handled)
      if (this.handleKeybindAction(e.code)) {
        e.preventDefault();
        return;
      }
    };

    this.keyupHandler = (e) => {
      this.keys.delete(e.code);
    };

    this.mousedownHandler = (e) => {
      this.mouseButtons.add(e.button);
      this.updateMousePosition(e, canvas);
    };

    this.mouseupHandler = (e) => {
      this.mouseButtons.delete(e.button);
      this.updateMousePosition(e, canvas);
    };

    this.clickHandler = (e) => {
      this.handleClick(e, canvas);
    };

    this.contextmenuHandler = (e) => {
      e.preventDefault(); // Prevent browser context menu
      this.handleRightClick(e, canvas);
    };

    this.mousemoveHandler = (e) => {
      this.updateMousePosition(e, canvas);
    };

    // Attach event listeners
    window.addEventListener("keydown", this.keydownHandler);
    window.addEventListener("keyup", this.keyupHandler);
    canvas.addEventListener("mousedown", this.mousedownHandler);
    canvas.addEventListener("mouseup", this.mouseupHandler);
    canvas.addEventListener("click", this.clickHandler);
    canvas.addEventListener("contextmenu", this.contextmenuHandler);
    canvas.addEventListener("mousemove", this.mousemoveHandler);
  }

  // Set the network system to send input updates to
  setNetworkSystem(networkSystem: any) {
    this.networkSystem = networkSystem;
  }

  // Set the render system for camera position access
  setRenderSystem(renderSystem: any) {
    this.renderSystem = renderSystem;
  }

  // Set callback for game menu toggle
  setToggleGameMenuCallback(callback: () => void) {
    this.onToggleGameMenu = callback;
  }

  update(entities: Map<EntityId, Entity>, _deltaTime: number): void {
    // Debug logging
    if (Math.random() < 0.01) {
      // Log ~1% of frames
      console.log(
        "[INPUT] InputSystem update - entities:",
        entities.size,
        "keys pressed:",
        this.keys.size
      );
    }

    // Handle mouse clicks for targeting
    this.handleMouseClicks(entities);

    // Handle right-clicks for harvesting
    this.handleRightClicks(entities);

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

  private handleClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
    // Only handle left mouse button clicks
    if (event.button !== 0) return;

    // Get click position in canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Store the click for processing in the update loop
    this.pendingClick = { x: clickX, y: clickY };
  }

  private handleRightClick(event: MouseEvent, canvas: HTMLCanvasElement): void {
    // Get click position in canvas coordinates
    const rect = canvas.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;

    // Store the right-click for processing in the update loop
    this.pendingRightClick = { x: clickX, y: clickY };
  }

  private pendingClick?: { x: number; y: number };
  private pendingRightClick?: { x: number; y: number };

  private handleMouseClicks(entities: Map<EntityId, Entity>): void {
    if (!this.pendingClick || !this.networkSystem) return;

    const { x: clickX, y: clickY } = this.pendingClick;

    // Get camera position from render system
    const cameraPos = this.renderSystem?.getCameraPosition() || { x: 0, y: 0 };

    // Convert screen coordinates to world coordinates
    const worldX = clickX + cameraPos.x;
    const worldY = clickY + cameraPos.y;

    // Find entities that were clicked on
    let clickedEntity: EntityId | undefined;
    let clickedPlayerId: string | undefined;
    let foundEntities = 0;

    for (const [entityId, entity] of entities) {
      const position = entity.components.get("position") as Position;
      const renderable = entity.components.get("renderable") as Renderable;
      const player = entity.components.get("player") as any;

      if (position && renderable) {
        foundEntities++;
        // Check if click is within entity bounds (32x32 centered on position)
        const halfSize = 16;
        if (
          worldX >= position.x - halfSize &&
          worldX <= position.x + halfSize &&
          worldY >= position.y - halfSize &&
          worldY <= position.y + halfSize
        ) {
          clickedEntity = entityId;
          clickedPlayerId = player?.id;
          break;
        }
      }
    }
    // Send targeting request to server
    if (clickedEntity) {
      // For players, use player ID; for NPCs, use entity ID
      const targetId = clickedPlayerId || clickedEntity;
      this.networkSystem.setTarget(targetId);
    } else {
      // Clicked on empty space - clear target
      this.networkSystem.clearTarget();
    }

    // Clear pending click
    this.pendingClick = undefined;
  }

  private handleRightClicks(entities: Map<EntityId, Entity>): void {
    if (!this.pendingRightClick || !this.networkSystem) return;

    const { x: clickX, y: clickY } = this.pendingRightClick;

    // Get camera position from render system
    const cameraPos = this.renderSystem?.getCameraPosition() || { x: 0, y: 0 };

    // Convert screen coordinates to world coordinates
    const worldX = clickX + cameraPos.x;
    const worldY = clickY + cameraPos.y;

    // Find player position for distance checking
    const playerEntity = Array.from(entities.values()).find(
      (entity) =>
        entity.components.has("position") &&
        entity.components.has("player") &&
        (entity.components.get("player") as any)?.isLocal
    );

    if (!playerEntity) {
      this.pendingRightClick = undefined;
      return;
    }

    const playerPosition = playerEntity.components.get("position") as Position;
    if (!playerPosition) {
      this.pendingRightClick = undefined;
      return;
    }

    // Find harvestable game objects near the click
    let clickedHarvestableObject: EntityId | undefined;
    const harvestRange = 100; // pixels - should match server validation

    for (const [entityId, entity] of entities) {
      const position = entity.components.get("position") as Position;
      const gameObject = entity.components.get("gameObject") as any;

      if (position && gameObject && gameObject.harvestable) {
        // Check if click is within entity bounds (32x32 centered on position)
        const halfSize = 16;
        const clickedOnObject =
          worldX >= position.x - halfSize &&
          worldX <= position.x + halfSize &&
          worldY >= position.y - halfSize &&
          worldY <= position.y + halfSize;

        if (clickedOnObject) {
          // Check distance from player to object
          const dx = position.x - playerPosition.x;
          const dy = position.y - playerPosition.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance <= harvestRange) {
            clickedHarvestableObject = entityId;
            console.log(
              `[INPUT] Right-clicked harvestable object ${entityId} (${gameObject.name}) at distance ${distance.toFixed(1)}px`
            );
            break;
          } else {
            console.log(
              `[INPUT] Harvestable object ${entityId} (${gameObject.name}) too far (${distance.toFixed(1)}px > ${harvestRange}px)`
            );
          }
        }
      }
    }

    // Send harvest request if we found a valid target
    if (clickedHarvestableObject) {
      this.networkSystem.harvestObject(clickedHarvestableObject);
    }

    // Clear pending right-click
    this.pendingRightClick = undefined;
  }

  private handleKeybindAction(keyCode: string): boolean {
    const keybindStore = useKeybindStore.getState();
    const uiStore = useUIStore.getState();
    const actionId = keybindStore.getActionForKey(keyCode);

    if (!actionId) return false;

    switch (actionId) {
      case "toggle_game_menu":
        if (this.onToggleGameMenu) {
          this.onToggleGameMenu();
        } else {
          // Fallback to store
          keybindStore.toggleGameMenu();
        }
        return true;

      case "toggle_bag":
        uiStore.toggleBags();
        return true;

      case "toggle_inventory":
        uiStore.toggleInventory();
        return true;

      case "toggle_skills":
        uiStore.toggleTradeskills();
        return true;

      case "toggle_character":
        uiStore.toggleCharacter();
        return true;

      default:
        return false;
    }
  }

  // Clean up event listeners
  cleanup(): void {
    window.removeEventListener("keydown", this.keydownHandler);
    window.removeEventListener("keyup", this.keyupHandler);
    this.canvas.removeEventListener("mousedown", this.mousedownHandler);
    this.canvas.removeEventListener("mouseup", this.mouseupHandler);
    this.canvas.removeEventListener("click", this.clickHandler);
    this.canvas.removeEventListener("contextmenu", this.contextmenuHandler);
    this.canvas.removeEventListener("mousemove", this.mousemoveHandler);
  }
}
