// Database schema definitions for Kysely
import { ColumnType, Generated } from 'kysely'

// Player table
export interface PlayerTable {
  id: Generated<string>
  accountId: string
  charName: string
  level: number
  experience: number
  positionX: number
  positionY: number
  positionZ: number | null
  hp: number
  maxHp: number
  mp: number
  maxMp: number
  strength: number
  dexterity: number
  intelligence: number
  vitality: number
  gold: number
  createdAt: ColumnType<Date, string | undefined, never>
  updatedAt: ColumnType<Date, string | undefined, Date>
}

// Item table
export interface ItemTable {
  id: Generated<string>
  templateId: string
  name: string
  description: string | null
  type: string
  rarity: string
  level: number
  stats: string // JSON string for item stats
  durability: number | null
  maxDurability: number | null
  stackable: boolean
  maxStack: number | null
  createdAt: ColumnType<Date, string | undefined, never>
}

// Player Inventory table
export interface PlayerInventoryTable {
  id: Generated<string>
  playerId: string
  itemId: string
  slot: number
  quantity: number
  durability: number | null
}

// Player Equipment table
export interface PlayerEquipmentTable {
  id: Generated<string>
  playerId: string
  slot: string // 'head', 'chest', 'legs', etc.
  itemId: string
  durability: number | null
}

// Recipe table
export interface RecipeTable {
  id: Generated<string>
  name: string
  description: string | null
  skillType: string // 'blacksmithing', 'leatherworking', etc.
  skillRequired: number
  inputs: string // JSON string for recipe inputs
  outputs: string // JSON string for recipe outputs
  craftingTime: number // in seconds
  successRate: number | null // 0-100, null for 100%
  createdAt: ColumnType<Date, string | undefined, never>
}

// Player Skills table
export interface PlayerSkillTable {
  id: Generated<string>
  playerId: string
  skillType: string // 'mining', 'herbing', 'blacksmithing', etc.
  experience: number
  level: number
}

// Guild table
export interface GuildTable {
  id: Generated<string>
  name: string
  description: string | null
  leaderId: string
  createdAt: ColumnType<Date, string | undefined, never>
  updatedAt: ColumnType<Date, string | undefined, Date>
}

// Guild Member table
export interface GuildMemberTable {
  id: Generated<string>
  guildId: string
  playerId: string
  rank: string // 'leader', 'officer', 'member'
  joinedAt: ColumnType<Date, string | undefined, never>
}

// Node table (resource nodes)
export interface NodeTable {
  id: Generated<string>
  templateId: string
  mapId: string
  positionX: number
  positionY: number
  positionZ: number | null
  type: string // 'mining', 'herbing', 'skinning'
  level: number
  respawnTime: number // in seconds
  requiredTool: string | null
  drops: string // JSON string for drop table
  createdAt: ColumnType<Date, string | undefined, never>
}

// Quest table
export interface QuestTable {
  id: Generated<string>
  name: string
  description: string
  type: string // 'kill', 'gather', 'deliver', 'escort'
  level: number
  objectives: string // JSON string for quest objectives
  rewards: string // JSON string for quest rewards
  mapId: string | null
  npcId: string | null
  createdAt: ColumnType<Date, string | undefined, never>
}

// Player Quest table
export interface PlayerQuestTable {
  id: Generated<string>
  playerId: string
  questId: string
  status: string // 'active', 'completed', 'failed'
  progress: string // JSON string for quest progress
  startedAt: ColumnType<Date, string | undefined, never>
  completedAt: Date | null
}

// Map table
export interface MapTable {
  id: Generated<string>
  name: string
  description: string | null
  width: number
  height: number
  navmesh: string | null // JSON string for navmesh data
  spawnPoints: string | null // JSON string for spawn points
  createdAt: ColumnType<Date, string | undefined, never>
}

// Database interface
export interface Database {
  players: PlayerTable
  items: ItemTable
  player_inventories: PlayerInventoryTable
  player_equipment: PlayerEquipmentTable
  recipes: RecipeTable
  player_skills: PlayerSkillTable
  guilds: GuildTable
  guild_members: GuildMemberTable
  nodes: NodeTable
  quests: QuestTable
  player_quests: PlayerQuestTable
  maps: MapTable
}
