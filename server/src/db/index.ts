// Database connection and utilities
import { Kysely, SqliteDialect, sql } from "kysely";
import Database from "better-sqlite3";
import { Database as DatabaseSchema } from "./schemas/database";
import { ITEM_TEMPLATES } from "../game/items/data/items";

// Create database connection
const dialect = new SqliteDialect({
  database: new Database(process.env.DB_PATH || "./ironwild.db"),
});

export const db = new Kysely<DatabaseSchema>({
  dialect,
});

// Database utilities
export class DatabaseService {
  static async initialize(): Promise<void> {
    try {
      // Create tables if they don't exist
      await this.createTables();

      // Populate items table with templates
      await this.populateItemsTable();

      console.log("Database initialized successfully");
    } catch (error) {
      console.error("Database initialization failed:", error);
      throw error;
    }
  }

  private static async createTables(): Promise<void> {
    // Create players table
    await db.schema
      .createTable("players")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("accountId", "text", (col) => col.notNull())
      .addColumn("charName", "text", (col) => col.notNull())
      .addColumn("level", "integer", (col) => col.notNull().defaultTo(1))
      .addColumn("experience", "integer", (col) => col.notNull().defaultTo(0))
      .addColumn("positionX", "real", (col) => col.notNull().defaultTo(0))
      .addColumn("positionY", "real", (col) => col.notNull().defaultTo(0))
      .addColumn("positionZ", "real")
      .addColumn("hp", "integer", (col) => col.notNull().defaultTo(100))
      .addColumn("maxHp", "integer", (col) => col.notNull().defaultTo(100))
      .addColumn("mp", "integer", (col) => col.notNull().defaultTo(50))
      .addColumn("maxMp", "integer", (col) => col.notNull().defaultTo(50))
      .addColumn("strength", "integer", (col) => col.notNull().defaultTo(10))
      .addColumn("dexterity", "integer", (col) => col.notNull().defaultTo(10))
      .addColumn("intelligence", "integer", (col) =>
        col.notNull().defaultTo(10)
      )
      .addColumn("vitality", "integer", (col) => col.notNull().defaultTo(10))
      .addColumn("gold", "integer", (col) => col.notNull().defaultTo(0))
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .addColumn("updatedAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create items table
    await db.schema
      .createTable("items")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("templateId", "text", (col) => col.notNull())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("rarity", "text", (col) => col.notNull())
      .addColumn("level", "integer", (col) => col.notNull())
      .addColumn("stats", "text", (col) => col.notNull())
      .addColumn("durability", "integer")
      .addColumn("maxDurability", "integer")
      .addColumn("stackable", "boolean", (col) =>
        col.notNull().defaultTo(false)
      )
      .addColumn("maxStack", "integer")
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create player_inventories table
    await db.schema
      .createTable("player_inventories")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("playerId", "text", (col) =>
        col.notNull().references("players.id").onDelete("cascade")
      )
      .addColumn("itemId", "text", (col) =>
        col.notNull().references("items.id").onDelete("cascade")
      )
      .addColumn("slot", "integer", (col) => col.notNull())
      .addColumn("quantity", "integer", (col) => col.notNull().defaultTo(1))
      .addColumn("durability", "integer")
      .execute();

    // Create player_equipment table
    await db.schema
      .createTable("player_equipment")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("playerId", "text", (col) =>
        col.notNull().references("players.id").onDelete("cascade")
      )
      .addColumn("slot", "text", (col) => col.notNull())
      .addColumn("itemId", "text", (col) =>
        col.notNull().references("items.id").onDelete("cascade")
      )
      .addColumn("durability", "integer")
      .execute();

    // Create recipes table
    await db.schema
      .createTable("recipes")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("skillType", "text", (col) => col.notNull())
      .addColumn("skillRequired", "integer", (col) => col.notNull())
      .addColumn("inputs", "text", (col) => col.notNull())
      .addColumn("outputs", "text", (col) => col.notNull())
      .addColumn("craftingTime", "integer", (col) => col.notNull())
      .addColumn("successRate", "integer")
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create player_skills table
    await db.schema
      .createTable("player_skills")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("playerId", "text", (col) =>
        col.notNull().references("players.id").onDelete("cascade")
      )
      .addColumn("skillType", "text", (col) => col.notNull())
      .addColumn("experience", "integer", (col) => col.notNull().defaultTo(0))
      .addColumn("level", "integer", (col) => col.notNull().defaultTo(1))
      .execute();

    // Create guilds table
    await db.schema
      .createTable("guilds")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("leaderId", "text", (col) =>
        col.notNull().references("players.id").onDelete("cascade")
      )
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .addColumn("updatedAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create guild_members table
    await db.schema
      .createTable("guild_members")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("guildId", "text", (col) =>
        col.notNull().references("guilds.id").onDelete("cascade")
      )
      .addColumn("playerId", "text", (col) =>
        col.notNull().references("players.id").onDelete("cascade")
      )
      .addColumn("rank", "text", (col) => col.notNull())
      .addColumn("joinedAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create nodes table
    await db.schema
      .createTable("nodes")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("templateId", "text", (col) => col.notNull())
      .addColumn("mapId", "text", (col) => col.notNull())
      .addColumn("positionX", "real", (col) => col.notNull())
      .addColumn("positionY", "real", (col) => col.notNull())
      .addColumn("positionZ", "real")
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("level", "integer", (col) => col.notNull())
      .addColumn("respawnTime", "integer", (col) => col.notNull())
      .addColumn("requiredTool", "text")
      .addColumn("drops", "text", (col) => col.notNull())
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create quests table
    await db.schema
      .createTable("quests")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("type", "text", (col) => col.notNull())
      .addColumn("level", "integer", (col) => col.notNull())
      .addColumn("objectives", "text", (col) => col.notNull())
      .addColumn("rewards", "text", (col) => col.notNull())
      .addColumn("mapId", "text")
      .addColumn("npcId", "text")
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();

    // Create player_quests table
    await db.schema
      .createTable("player_quests")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("playerId", "text", (col) =>
        col.notNull().references("players.id").onDelete("cascade")
      )
      .addColumn("questId", "text", (col) =>
        col.notNull().references("quests.id").onDelete("cascade")
      )
      .addColumn("status", "text", (col) => col.notNull())
      .addColumn("progress", "text", (col) => col.notNull())
      .addColumn("startedAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .addColumn("completedAt", "datetime")
      .execute();

    // Create maps table
    await db.schema
      .createTable("maps")
      .ifNotExists()
      .addColumn("id", "text", (col) => col.primaryKey())
      .addColumn("name", "text", (col) => col.notNull())
      .addColumn("description", "text")
      .addColumn("width", "integer", (col) => col.notNull())
      .addColumn("height", "integer", (col) => col.notNull())
      .addColumn("navmesh", "text")
      .addColumn("spawnPoints", "text")
      .addColumn("createdAt", "datetime", (col) =>
        col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`)
      )
      .execute();
  }

  private static async populateItemsTable(): Promise<void> {
    // Check if items table is already populated
    const existingCount = await db
      .selectFrom("items")
      .select(db.fn.count("id").as("count"))
      .executeTakeFirst();

    if (existingCount && Number(existingCount.count) > 0) {
      console.log("Items table already populated, skipping...");
      return;
    }

    console.log("Populating items table with templates...");

    const itemsToInsert = Object.values(ITEM_TEMPLATES).map((template) => {
      const item = {
        id: template.id,
        templateId: template.id,
        name: template.name,
        description: template.description || null,
        type: template.type,
        rarity: template.rarity,
        level: template.level,
        stats: JSON.stringify(template.stats || {}),
        durability: template.durability || null,
        maxDurability: template.maxDurability || null,
        stackable: template.stackable,
        maxStack: template.maxStack || null,
      };

      // Debug: Check for any non-primitive values
      Object.entries(item).forEach(([key, value]) => {
        if (
          value !== null &&
          typeof value !== "string" &&
          typeof value !== "number" &&
          typeof value !== "boolean"
        ) {
          console.error(`Invalid type for ${key}:`, typeof value, value);
        }
      });

      return item;
    });

    if (itemsToInsert.length > 0) {
      await db.insertInto("items").values(itemsToInsert).execute();
      console.log(`Populated items table with ${itemsToInsert.length} items`);
    }
  }

  static async close(): Promise<void> {
    await db.destroy();
  }
}
