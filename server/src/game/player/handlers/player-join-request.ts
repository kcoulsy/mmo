import { PlayerJoinRequestMessage, WorldStateMessage, SpellbookUpdateMessage } from "@shared/messages";
import { registerHandler } from "../../../core/types";
import { spellManager } from "../../spells/managers/spell-manager";

export const playerJoinHandler = registerHandler(
  "PLAYER_JOIN_REQUEST",
  async (ctx, message: PlayerJoinRequestMessage) => {
    const { session, world } = ctx;
    const { client } = session;
    const { playerManager } = world;

    if (client.playerId) {
      console.log(
        `Client ${client.id} already has player ${client.playerId}, ignoring join request`
      );
      return;
    }

    const playerName =
      message.playerName || `Adventurer_${Date.now().toString().slice(-4)}`;
    console.log(`Received PLAYER_JOIN_REQUEST from ${client.id}`);

    try {
      const player = await playerManager.createPlayer(client, {
        name: playerName,
        playerId: message.playerId,
      });

      // Update the session with the player ID
      session.playerId = player.id;

      const currentPlayers = playerManager.getAllPlayers();
      const currentEntities = world.gameObjectManager
        .getAllObjects()
        .map((obj) => {
          const template = world.gameObjectManager.getTemplate(obj.templateId);
          return {
            id: obj.id,
            components: [
              {
                type: "position",
                x: obj.position.x,
                y: obj.position.y,
                z: obj.position.z || 0,
              },
              {
                type: "gameObject",
                objectType: template?.objectType || "unknown",
                subtype: template?.subtype,
                name: template?.name || "Unknown",
                interactable: true,
                harvestable: obj.isActive,
              },
              {
                type: "renderable",
                spriteId: template?.spriteId || "unknown",
                layer: 0, // Game objects render behind players
                frame: 0,
              },
            ],
          };
        });

      const worldStateMessage: WorldStateMessage = {
        type: "WORLD_STATE",
        timestamp: Date.now(),
        players: currentPlayers,
        entities: currentEntities,
      };
      world.sendToSession(client.id, worldStateMessage);

      // Initialize player spellbook based on level
      spellManager.initializePlayerSpellbook(player.id, player.stats.level);

      // Send spellbook to player
      const playerSpells = spellManager.getPlayerSpells(player.id);
      const spellbookMessage: SpellbookUpdateMessage = {
        type: "SPELLBOOK_UPDATE",
        timestamp: Date.now(),
        playerId: player.id,
        spells: playerSpells.map((spell) => ({
          spellId: spell.spellId,
          level: spell.level,
          cooldownUntil: spell.cooldownUntil > Date.now() ? spell.cooldownUntil : undefined,
        })),
      };
      world.sendToSession(client.id, spellbookMessage);

      console.log(`[SPELLS] Initialized spellbook for ${player.name} with ${playerSpells.length} spells`);
    } catch (error) {
      console.error(`Error creating player ${playerName}:`, error);
    }
  }
);
