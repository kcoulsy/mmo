// Server entry point
import { ServerWorld } from './ecs/world'
import { DatabaseService } from './db'
import { CombatSystem } from './systems/CombatSystem'
import { MovementSystem } from './systems/MovementSystem'
import { TradeskillSystem } from './systems/TradeskillSystem'

async function main() {
  console.log('Starting Emberfall server...')

  // Initialize database
  await DatabaseService.initialize()

  // Initialize ECS world
  const world = new ServerWorld()

  // Add systems
  world.addSystem(new CombatSystem())
  world.addSystem(new MovementSystem())
  world.addSystem(new TradeskillSystem())

  // Create a test NPC entity
  const npcId = world.createEntity()
  world.addComponent(npcId, {
    type: 'position',
    x: 100,
    y: 100,
    z: 0
  })
  world.addComponent(npcId, {
    type: 'renderable',
    spriteId: 'npc_guard',
    layer: 1,
    frame: 0
  })
  world.addComponent(npcId, {
    type: 'stats',
    hp: 200,
    maxHp: 200,
    mp: 0,
    maxMp: 0,
    attack: 15,
    defense: 10,
    moveSpeed: 0 // Stationary NPC
  })

  // Game tick loop (server-side)
  const TICK_RATE = 20 // 20 ticks per second
  const TICK_INTERVAL = 1000 / TICK_RATE

  setInterval(() => {
    const deltaTime = 1 / TICK_RATE
    world.update(deltaTime)
  }, TICK_INTERVAL)

  console.log('Emberfall server running!')
  console.log(`Tick rate: ${TICK_RATE} TPS`)

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('Shutting down server...')
    await DatabaseService.close()
    process.exit(0)
  })
}

main().catch(console.error)
