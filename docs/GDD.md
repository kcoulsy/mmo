# Isometric MMO — Game Design Document (Draft)

---

## High-level overview

**Title (working):** Emberfall (placeholder)

**Genre:** 2D Isometric Massively Multiplayer Online RPG

**Visual style:** Low-resolution, atmospheric isometric sprites and tiles reminiscent of early ARPGs (Diablo I feel): pixel-art with dramatic lighting and parallax layers. Large pre-built maps (instances/regions) rather than a continuous open world.

**Core pillars / player hooks:**

* Exploration: large distinct maps with points of interest (villages, ruins, caves, dungeons, multi-level interiors).
* Social & economy: player-driven trade, crafting, and gathering economy with persistence.
* Accessible combat: tab-target style + spells; straightforward to pick up but deep through gear/skills.
* Tradeskills matter: meaningful gathering and crafting loops (mining, herbing, skinning, blacksmithing, leatherworking).

**Tech stack (high level):**

* Client: TypeScript + HTML5 Canvas (isometric rendering), ECS architecture on client, WebSocket connection to server.
* Server: Node.js + TypeScript, authoritative game server built using an ECS-style model; WebSockets for real-time comms.
* Networking: websocket transport, binary-compact message format (MsgPack / protobuf / custom binary), server authoritative with client prediction & interpolation.
* Persistence: database (Postgres recommended) for account/character data, item DB, economy state, and map definitions.

---

## Design goals & constraints

* **Playstyle**: MMO with instanced/large maps, supporting both solo & small-group gameplay. Not a sprawling open-world to simplify streaming and latency.
* **Movement**: Smooth navmesh-based movement (not grid). Players click to move, characters navigate across navmesh using pathfinding.
* **Combat**: Tab-target system: target lock + action bars/spell slots. Spells have cast times, cooldowns, and resource cost.
* **Tradeskills**: Non-mini-game focused — more like RuneScape: gather, process, and craft into items that feed the economy.
* **Scalability**: Design for many small regions per server instance rather than huge single shard.

---

## Gameplay systems

### Player character

* Attributes: STR, DEX, INT, VIT (examples). Derived stats: HP, MP/energy, attack power, defense, crit chance, move speed.
* Leveling: XP from combat, quests, and some tradeskill milestones. Level unlocks talent points / skill tiers.
* Equipment slots: Head, chest, legs, hands, feet, weapon (main), off-hand, jewelry x2, cloak, bag.
* Inventory: weight or slot-based policy to decide (slot-based simpler to start).

### Combat & Spellcasting

* **Targeting:** Tab cycles through nearby hostile targets; clicking a target also locks it. Auto-attack when in range.
* **Actions:** Quickbar with n slots (e.g., 8). Spells can be click-to-cast or instant-target.
* **Spell types:** Instant, cast-channel, channeled, AoE (ground-target), buff/debuff.
* **Hit resolution:** Server authoritative: server resolves damage and sends state updates. Clients run animation prediction for responsiveness.
* **Status effects:** Buffs/debuffs with durations tracked server-side.

### Movement & Navmesh

* Map designers supply navmesh per region (polygonal walkable areas). Use A* or funnel algorithm for pathfinding across navmesh polygons.
* Avoid grid snapping. Use continuous positions (floats) for interpolation.
* Movement messages: client sends movement intent (destination, timestamp). Server validates path against navmesh and responds with authoritative position snapshots.

### Tradeskills & Crafting

* **Gathering skills:** Mining, Herbing, Skinning. Nodes are placed on maps with respawn timers influenced by server population.
* **Processing / Crafts:** Blacksmithing and Leatherworking take gathered raw nodes and combine (recipes) to make gear, tools, consumables.
* **Skill progression:** XP-based per skill (perform actions to level the skill). Higher-tier nodes/recipes require higher skill ranks and tools.
* **Tools & durability:** Tools required for some actions (pickaxe, knife). Durability can be implemented optionally to create item sinks.
* **Economy:** Player-run market (auction house or player trading). Crafted items should have utility and demand.

### Quests & Content

* Map-based quests with simple text objectives and map markers. Quest types: kill X, gather Y, deliver, escort, multi-step story chains.
* Dungeons and caves as instanced or shared areas with higher drop rates and unique resources.

### Social systems

* Party & grouping; basic chat channels (local, party, guild, global) with rate limits and moderation tools.
* Guild system with simple guild bank and ranks.

---

## Art & Audio vision

* Palette: muted, earthy colors with occasional saturated accents to guide the eye.
* Sprites: small tile size (e.g., 32x32 or 48x48) scaled to achieve the Diablo I feel; layered sprites for equipment.
* Lighting: simple dynamic lighting effects (screen-space overlays) and shadows for mood.
* Audio: ambient map tracks + reactive SFX for spells, attacks, and node gathering.

---

## UI/UX

* Isometric HUD with minimap, target frame, action bar, chat window, and tradeskill panels.
* Inventory/character sheet popovers. Crafting UI that shows required inputs and expected output.
* Accessibility: scalable UI, colorblind-friendly palettes, keyboard bindings for the most common actions.

---

## Technical architecture (detailed)

### Client-side (TypeScript + Canvas)

* **ECS**: Entities (players, NPCs, items, nodes), Components (Position, Velocity, Renderable, Collider, Stats, Inventory, AIState, NavAgent), Systems (RenderSystem, MovementSystem, CombatSystem, NavSystem, UISystem, NetworkSyncSystem).
* **Rendering pipeline:** Isometric camera projection -> culling -> ordered draw list by y-depth -> render to Canvas. Parallax and layers for ground/objects/overlays.
* **Input handling:** Mouse + keyboard. Click-to-move translates to world-space destination; UI input separate from world clicks.
* **Network client:** WebSocket manager, message serializer/deserializer, interpolation buffer for remote entities.

### Server-side (Node + TypeScript)

* **Authoritative ECS:** Mirror of client ECS for gameplay-critical components. Systems run at fixed tick-rate.
* **Networking layer:** WebSocket server, connection manager, message routing. Consider rooms = map instances to partition load.
* **Persistence layer:** Character data, inventories, guilds, item definitions, map owners.
* **Tick & snapshots:** Fixed tick (e.g., 20-30 ticks/s). Server emits snapshots or deltas to clients at a lower rate (e.g., 10–20 Hz) with entity state for interpolation.
* **Scaling:** Map instances can be moved across worker processes or machines. Use a matchmaking/region service for routing players to map instances.

### Networking considerations

* **Message types:** InputIntent (movement target, actions), Chat, SpellCastRequest, CraftRequest, InventoryAction, Ping/Heartbeat.
* **Authoritative rules:** Server validates actions (cooldowns, resource availability, position checks using navmesh). Prevents teleport/hack.
* **Prediction & reconciliation:** Client locally simulates movement & immediate ability animations; server corrects when mismatch occurs with smooth correction.
* **Security:** Rate-limiting, anti-cheat checks, server-side validation of important computations.

---

## Data model (summary)

* **Player:** id, accountId, charName, level, stats, position, inventory(list of ItemStacks), skills (gathering/crafting), equipment, quests.
* **Item:** id, templateId, name, stats, durability, requirements.
* **Recipe:** id, inputs, outputs, skillRequirements, craftingTime, successRate (if RNG used).
* **Node:** id, type, position, respawnTimer, requiredTool, drops(list).
* **Map:** id, navmesh, spawnPoints, node placements, POIs, instanceRules.

---

## Map & content design

* Each map is a distinct region with design goals (village, swamp, ruins). Include interiors (houses, caves) with their own navmesh layers.
* Use layers for verticality (bridges, multiple floors). Navmesh should contain connectivity info between levels.
* Place resource nodes and enemies intentionally to encourage exploration and social encounters.

---

## Monetization & Live Ops (brief)

* Prefer cosmetic monetization: mounts, skins, housing decorations. Avoid pay-to-win.
* Quality-of-life microtransactions: extra inventory tabs, non-gameplay altering convenience.
* Live events and seasonal content to drive re-engagement.

---

## Roadmap & milestones (example)

1. Prototype (1–2 months): core movement, navmesh test, basic rendering, one example map, server-authoritative movement.
2. Combat prototype (1–2 months): targeting, basic spells, server hit resolution, client prediction.
3. Tradeskill prototype (1–2 months): gathering nodes, simple recipes, inventory.
4. Multiplayer demo (2 months): multiple clients connecting to server, basic chat, one shared map instance.
5. Content & polish (ongoing): maps, quests, art, sound, analytics, anti-cheat.

---

## Performance targets & constraints

* Target 60 FPS on typical desktop browsers; lower-end devices should degrade gracefully.
* Server tick 20–30 ticks/sec; snapshot/network update 10–20 Hz.
* Aim for small packet sizes; use binary serialization for frequent updates.

---

## Testing & QA strategy

* Unit tests for server systems (combat resolution, crafting, inventory).
* Integration tests for network flows (movement, spells, crafting).
* Automated simulation (bots) to stress test server instance scaling and node respawn balancing.

---

## Risks & open technical challenges

* **Netcode complexity:** implementing smooth client prediction + server reconciliation for tab-target combat with spells that involve positions (AoE) is non-trivial.
* **Navmesh authoring:** tooling needed to build, edit, and version navmeshes per map and floor.
* **Economy balancing:** player-driven economies are difficult to balance and can be exploited.

---

## Appendices

### ECS component list (initial)

* Position {x, y, z?}
* Velocity {vx, vy}
* NavAgent {destination, path, state}
* Renderable {spriteId, layer, frame}
* Collider {shape}
* Stats {hp, mp, attack, defenses}
* Inventory {slots}
* Equipment {slot->itemId}
* SkillSet {skill->xp}
* Lootable {drops}

### Suggested message schema (high-level)

* `Msg.InputIntent {clientTime, destX, destY, inputId}`
* `Msg.SpellCast {spellId, targetId, castPos, clientTime}`
* `Msg.Snapshot {tick, entities:[{id, pos, vel, state}...]}`
* `Msg.Chat {channel, text}`

---


✅ Recommended Folder Structure

This is divided into client, server, shared, and tools.
The goal: clean separation, clear boundaries, optimized for long-term scalability.


├── client/
│   ├── src/
│   │   ├── ecs/
│   │   │   ├── components/
│   │   │   ├── systems/
│   │   │   ├── entities/
│   │   │   └── index.ts
│   │   ├── rendering/
│   │   │   ├── sprites/
│   │   │   ├── tiles/
│   │   │   ├── animation/
│   │   │   └── camera/
│   │   ├── input/
│   │   ├── ui/
│   │   │   ├── hud/
│   │   │   ├── windows/
│   │   │   └── chat/
│   │   ├── net/
│   │   │   ├── websocket.ts
│   │   │   ├── messages.ts
│   │   │   └── interpolation/
│   │   ├── game/
│   │   │   ├── GameLoop.ts
│   │   │   ├── GameState.ts
│   │   │   └── config.ts
│   │   ├── maps/
│   │   │   ├── data/          # region definitions (JSON)
│   │   │   └── navmesh/       # baked navmeshes
│   │   ├── assets/
│   │   └── main.ts
│   ├── public/
│   └── vite.config.ts
│
├── server/
│   ├── src/
│   │   ├── ecs/
│   │   │   ├── components/
│   │   │   ├── systems/
│   │   │   ├── entities/
│   │   │   └── index.ts
│   │   ├── net/
│   │   │   ├── websocketServer.ts
│   │   │   ├── messageHandlers/
│   │   │   └── serializer/
│   │   ├── world/
│   │   │   ├── maps/
│   │   │   ├── regions/
│   │   │   ├── spawners/
│   │   │   └── navmesh/
│   │   ├── systems/
│   │   │   ├── CombatSystem.ts
│   │   │   ├── MovementSystem.ts
│   │   │   └── TradeskillSystem.ts
│   │   ├── db/
│   │   │   ├── schemas/
│   │   │   ├── models/
│   │   │   └── index.ts
│   │   ├── config/
│   │   ├── utils/
│   │   └── index.ts
│   ├── prisma/ (or drizzle)
│   ├── scripts/
│   └── tsconfig.json
│
├── shared/
│   ├── types/
│   ├── messages/          # shared msg schemas
│   ├── constants/
│   ├── ecs/               # optional shared ECS parts
│   ├── math/
│   └── utils/
│
├── tools/
│   ├── map-editor/        # Electron or browser map/navmesh editor
│   ├── navmesh-baker/     # Generates polygon mesh
│   ├── sprite-packer/     # Atlas compile tool
│   └── data-validator/    # Ensures items/maps/recipes are valid
│
├── assets/
│   ├── tilesets/
│   ├── characters/
│   ├── items/
│   ├── audio/
│   └── fx/
│
├── docs/
│   └── GDD.md
│
├── package.json
└── turbo.json (optional)

✅ Recommended Tools & Libraries
Rendering & Graphics

HTML5 Canvas (native, fast enough for 2D isometric)

OffscreenCanvas for background rendering (if performance needed)

tiny-ecs (if you want a super-small ECS, or we can do custom)

sprite packing

free-tex-packer-cli

or ShoeBox / TexturePacker

Networking

uWebSockets.js (10x faster than ws, recommended for MMO)

protobuf or msgpackr for binary messages

colyseus schema (only if you want automatic sync; optional)

Server

TypeScript Node.js

Drizzle ORM or Prisma

BullMQ if you need background jobs

worker_threads for region instances

Map / Navmesh Tools

You will want a simple tool set:

1. Map Editor

Can be:

a small Electron app, OR

a browser editor built in HTML/Canvas

Should support:

placing tiles

marking decorative layers

paint collisions

place NPC spawns

place resource nodes

define interior transitions

2. Navmesh Baker

Input: tilemap + collision data

Output: polygon navmesh (.json)

Recommended libs:

navmesh.ts (tiny library)

@recast-navigation/core (WASM port of Recast/Detour)

3. Data Compiler

Takes raw game data → produces runtime-optimized bundles.

Includes:

items

recipes

spells

enemies

maps

node spawn tables

Outputs compressed JSON or binary.

Build Tools

Vite for the client

tsup or esbuild for the server

Turborepo if you want a monorepo with shared code

ESLint + Prettier

Vitest for testing

✅ Optional Dev Enhancements

In-game debug console (press ~)

Entity inspector overlay (debug draw hitboxes)

Lag simulation toggle for netcode testing

Hot reload of maps & item data