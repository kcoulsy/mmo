// Player database model
import { db } from "../index";
import { sql } from "kysely";

export interface Player {
  id: string;
  accountId: string;
  charName: string;
  level: number;
  experience: number;
  position: { x: number; y: number; z?: number };
  stats: {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    strength: number;
    dexterity: number;
    intelligence: number;
    vitality: number;
  };
  gold: number;
  createdAt: Date;
  updatedAt: Date;
}

export class PlayerModel {
  static async create(
    playerData: Omit<Player, "id" | "createdAt" | "updatedAt">
  ): Promise<Player> {
    const now = new Date();
    const id = `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db
      .insertInto("players")
      .values({
        id,
        accountId: playerData.accountId,
        charName: playerData.charName,
        level: playerData.level,
        experience: playerData.experience,
        positionX: playerData.position.x,
        positionY: playerData.position.y,
        positionZ: playerData.position.z || null,
        hp: playerData.stats.hp,
        maxHp: playerData.stats.maxHp,
        mp: playerData.stats.mp,
        maxMp: playerData.stats.maxMp,
        strength: playerData.stats.strength,
        dexterity: playerData.stats.dexterity,
        intelligence: playerData.stats.intelligence,
        vitality: playerData.stats.vitality,
        gold: playerData.gold,
        createdAt: sql`CURRENT_TIMESTAMP`,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      })
      .execute();

    return {
      id,
      accountId: playerData.accountId,
      charName: playerData.charName,
      level: playerData.level,
      experience: playerData.experience,
      position: playerData.position,
      stats: playerData.stats,
      gold: playerData.gold,
      createdAt: now,
      updatedAt: now,
    };
  }

  static async findById(id: string): Promise<Player | null> {
    const result = await db
      .selectFrom("players")
      .where("id", "=", id)
      .selectAll()
      .executeTakeFirst();

    if (!result) return null;

    return {
      id: result.id,
      accountId: result.accountId,
      charName: result.charName,
      level: result.level,
      experience: result.experience,
      position: {
        x: result.positionX,
        y: result.positionY,
        z: result.positionZ || undefined,
      },
      stats: {
        hp: result.hp,
        maxHp: result.maxHp,
        mp: result.mp,
        maxMp: result.maxMp,
        strength: result.strength,
        dexterity: result.dexterity,
        intelligence: result.intelligence,
        vitality: result.vitality,
      },
      gold: result.gold,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  static async findByAccountId(accountId: string): Promise<Player[]> {
    const results = await db
      .selectFrom("players")
      .where("accountId", "=", accountId)
      .selectAll()
      .execute();

    return results.map((result) => ({
      id: result.id,
      accountId: result.accountId,
      charName: result.charName,
      level: result.level,
      experience: result.experience,
      position: {
        x: result.positionX,
        y: result.positionY,
        z: result.positionZ || undefined,
      },
      stats: {
        hp: result.hp,
        maxHp: result.maxHp,
        mp: result.mp,
        maxMp: result.maxMp,
        strength: result.strength,
        dexterity: result.dexterity,
        intelligence: result.intelligence,
        vitality: result.vitality,
      },
      gold: result.gold,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    }));
  }

  static async update(id: string, updates: Partial<Player>): Promise<Player> {
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (updates.charName !== undefined) updateData.charName = updates.charName;
    if (updates.level !== undefined) updateData.level = updates.level;
    if (updates.experience !== undefined)
      updateData.experience = updates.experience;
    if (updates.position !== undefined) {
      updateData.positionX = updates.position.x;
      updateData.positionY = updates.position.y;
      updateData.positionZ = updates.position.z || null;
    }
    if (updates.stats !== undefined) {
      updateData.hp = updates.stats.hp;
      updateData.maxHp = updates.stats.maxHp;
      updateData.mp = updates.stats.mp;
      updateData.maxMp = updates.stats.maxMp;
      updateData.strength = updates.stats.strength;
      updateData.dexterity = updates.stats.dexterity;
      updateData.intelligence = updates.stats.intelligence;
      updateData.vitality = updates.stats.vitality;
    }
    if (updates.gold !== undefined) updateData.gold = updates.gold;

    await db
      .updateTable("players")
      .set(updateData)
      .where("id", "=", id)
      .execute();

    // Return the updated player
    return (await this.findById(id)) as Player;
  }

  static async delete(id: string): Promise<void> {
    await db.deleteFrom("players").where("id", "=", id).execute();
  }
}
