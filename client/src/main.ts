// Client entry point
import { ClientWorld } from './ecs/world'
import { RenderSystem } from './ecs/systems/renderSystem'
import { MovementSystem } from './ecs/systems/movementSystem'
import { InputSystem } from './ecs/systems/inputSystem'

// Initialize canvas
const canvas = document.createElement('canvas')
canvas.width = 800
canvas.height = 600
canvas.style.border = '1px solid #000'
document.body.appendChild(canvas)

// Initialize ECS world
const world = new ClientWorld()

// Add systems
const renderSystem = new RenderSystem(canvas)
const movementSystem = new MovementSystem()
const inputSystem = new InputSystem(canvas)

world.addSystem(inputSystem)
world.addSystem(movementSystem)
world.addSystem(renderSystem)

// Create a test player entity
const playerId = world.createEntity()
world.addComponent(playerId, {
  type: 'position',
  x: 400,
  y: 300,
  z: 0
})
world.addComponent(playerId, {
  type: 'velocity',
  vx: 0,
  vy: 0
})
world.addComponent(playerId, {
  type: 'renderable',
  spriteId: 'player',
  layer: 1,
  frame: 0
})
world.addComponent(playerId, {
  type: 'stats',
  hp: 100,
  maxHp: 100,
  mp: 50,
  maxMp: 50,
  attack: 10,
  defense: 5,
  moveSpeed: 100
})

// Game loop
let lastTime = 0
function gameLoop(currentTime: number) {
  const deltaTime = (currentTime - lastTime) / 1000 // Convert to seconds
  lastTime = currentTime

  world.update(deltaTime)

  requestAnimationFrame(gameLoop)
}

// Start game loop
requestAnimationFrame(gameLoop)

console.log('Emberfall client started!')
