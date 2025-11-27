import { registerHandler } from "../../../core/types";
import {
  CastSpellMessage,
  SpellCastResultMessage,
  SpellEffectMessage,
  ChatMessage,
} from "@shared/messages";
import { spellManager } from "../managers/spell-manager";
import { effectManager } from "../managers/effect-manager";
import { getSpellTemplate } from "@shared/spells";

function sendSystemChatMessage(session: any, message: string) {
  const chatMessage: ChatMessage = {
    type: "CHAT_MESSAGE",
    timestamp: Date.now(),
    playerId: "system",
    playerName: "System",
    message,
    mode: "global",
  };
  session.send(chatMessage);
}

export const castSpellHandler = registerHandler(
  "CAST_SPELL",
  async (ctx, message: CastSpellMessage) => {
    try {
      const { session, world } = ctx;

      if (!session.playerId) {
        return;
      }

      const { spellId, targetEntityId, targetPosition } = message;

      console.log(`[SPELL] ${session.playerId} attempting to cast ${spellId}`);

      // Get the spell template
      const spellTemplate = getSpellTemplate(spellId);
      if (!spellTemplate) {
        const resultMessage: SpellCastResultMessage = {
          type: "SPELL_CAST_RESULT",
          timestamp: Date.now(),
          spellId,
          success: false,
          reason: "unknown_spell",
        };
        session.send(resultMessage);
        return;
      }

      // Get the caster (player)
      const caster = world.playerManager.getPlayer(session.playerId);
      if (!caster) {
        return;
      }

      // Validate spell can be cast
      const validation = spellManager.canCastSpell(
        session.playerId,
        spellId,
        caster.stats.mp
      );

      if (!validation.canCast) {
        const cooldownRemaining =
          validation.reason === "on_cooldown"
            ? spellManager.getCooldownRemaining(session.playerId, spellId)
            : undefined;

        const resultMessage: SpellCastResultMessage = {
          type: "SPELL_CAST_RESULT",
          timestamp: Date.now(),
          spellId,
          success: false,
          reason: validation.reason,
          cooldownRemaining,
        };
        session.send(resultMessage);

        // Send user-friendly message
        if (validation.reason === "insufficient_mana") {
          sendSystemChatMessage(session, `Not enough mana to cast ${spellTemplate.name}!`);
        } else if (validation.reason === "on_cooldown") {
          const remaining = Math.ceil(cooldownRemaining / 1000);
          sendSystemChatMessage(
            session,
            `${spellTemplate.name} is on cooldown (${remaining}s remaining).`
          );
        } else if (validation.reason === "spell_not_learned") {
          sendSystemChatMessage(session, `You don't know how to cast ${spellTemplate.name}.`);
        }

        return;
      }

      // Validate targeting
      let target = null;
      if (spellTemplate.requiresTarget && !targetEntityId) {
        const resultMessage: SpellCastResultMessage = {
          type: "SPELL_CAST_RESULT",
          timestamp: Date.now(),
          spellId,
          success: false,
          reason: "no_target",
        };
        session.send(resultMessage);
        sendSystemChatMessage(session, `${spellTemplate.name} requires a target.`);
        return;
      }

      // Get target if specified
      if (targetEntityId) {
        target = world.playerManager.getPlayer(targetEntityId);
        // TODO: Also check NPCs/monsters when combat system is added

        if (!target) {
          const resultMessage: SpellCastResultMessage = {
            type: "SPELL_CAST_RESULT",
            timestamp: Date.now(),
            spellId,
            success: false,
            reason: "invalid_target",
          };
          session.send(resultMessage);
          return;
        }

        // Check range
        const dx = target.position.x - caster.position.x;
        const dy = target.position.y - caster.position.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > spellTemplate.range) {
          const resultMessage: SpellCastResultMessage = {
            type: "SPELL_CAST_RESULT",
            timestamp: Date.now(),
            spellId,
            success: false,
            reason: "out_of_range",
          };
          session.send(resultMessage);
          sendSystemChatMessage(session, `${spellTemplate.name} target is out of range (${Math.floor(distance)}px, max ${spellTemplate.range}px).`);
          return;
        }

        // Check min range
        if (spellTemplate.minRange && distance < spellTemplate.minRange) {
          const resultMessage: SpellCastResultMessage = {
            type: "SPELL_CAST_RESULT",
            timestamp: Date.now(),
            spellId,
            success: false,
            reason: "too_close",
          };
          session.send(resultMessage);
          sendSystemChatMessage(session, `${spellTemplate.name} target is too close (${Math.floor(distance)}px, min ${spellTemplate.minRange}px).`);
          return;
        }
      }

      // Consume mana
      caster.stats.mp = Math.max(0, caster.stats.mp - spellTemplate.manaCost);

      // Start cooldown
      spellManager.startCooldown(session.playerId, spellId);

      // Process spell effects
      const spellEffects: SpellEffectMessage["effects"] = [];

      for (const effect of spellTemplate.effects) {
        // Only process immediate effects (cast time/channeling handled later)
        if (effect.timing !== "on_cast_complete") {
          continue;
        }

        // Damage effect
        if (effect.type === "damage" && effect.baseDamage) {
          let damage = effect.baseDamage;

          // Apply scaling
          if (effect.attackScaling) {
            damage += caster.stats.attack * effect.attackScaling;
          }
          if (effect.intelligenceScaling) {
            // Assume intelligence = level for now (add proper stat later)
            damage += caster.stats.level * effect.intelligenceScaling * 5;
          }

          damage = Math.floor(damage);

          // Apply damage to target
          if (target) {
            target.damage(damage);
            spellEffects.push({
              type: "damage",
              targetEntityId: target.id,
              amount: damage,
            });

            console.log(
              `[SPELL] ${caster.name} cast ${spellTemplate.name} on ${target.name} for ${damage} damage`
            );

            // Send damage message to caster
            sendSystemChatMessage(session, `${spellTemplate.name} hits ${target.name} for ${damage} damage!`);
          }
        }

        // Heal effect
        if (effect.type === "heal" && effect.baseHealing) {
          let healing = effect.baseHealing;

          // Apply scaling
          if (effect.intelligenceScaling) {
            healing += caster.stats.level * effect.intelligenceScaling * 5;
          }

          healing = Math.floor(healing);

          // Apply healing to target
          const healTarget = target || caster; // Default to self if no target
          healTarget.heal(healing);
          spellEffects.push({
            type: "heal",
            targetEntityId: healTarget.id,
            amount: healing,
          });

          console.log(
            `[SPELL] ${caster.name} cast ${spellTemplate.name} on ${healTarget.name} for ${healing} healing`
          );

          // Send healing message to caster
          sendSystemChatMessage(session, `${spellTemplate.name} heals ${healTarget.name} for ${healing} HP!`);
        }

        // Buff/Debuff effect
        if (
          (effect.type === "buff" || effect.type === "debuff") &&
          effect.duration
        ) {
          const effectTarget = target || caster;
          const effectId = effectManager.addEffect({
            spellId,
            casterId: caster.id,
            targetEntityId: effectTarget.id,
            effectType: effect.type,
            startTime: Date.now(),
            duration: effect.duration,
            statModifiers: effect.statModifiers,
          });

          spellEffects.push({
            type: effect.type,
            targetEntityId: effectTarget.id,
            buffType: effect.buffType,
            duration: effect.duration,
          });

          console.log(
            `[SPELL] ${caster.name} applied ${effect.type} to ${effectTarget.name}`
          );

          // Send buff/debuff message
          const effectName = effect.buffType || `${effect.type}`;
          sendSystemChatMessage(session, `${effectTarget.name} gains ${effectName} for ${Math.floor(effect.duration / 1000)}s!`);
        }

        // Teleport effect
        if (effect.type === "teleport") {
          if (targetPosition) {
            // Teleport to ground position
            caster.setPosition(targetPosition.x, targetPosition.y);
          } else if (target && effect.range) {
            // Teleport to target
            caster.setPosition(target.position.x, target.position.y);
          }

          spellEffects.push({
            type: "teleport",
            targetEntityId: caster.id,
          });

          console.log(`[SPELL] ${caster.name} teleported with ${spellTemplate.name}`);

          // Send teleport message
          sendSystemChatMessage(session, `You teleport with ${spellTemplate.name}!`);
        }
      }

      // Send success result to caster
      const resultMessage: SpellCastResultMessage = {
        type: "SPELL_CAST_RESULT",
        timestamp: Date.now(),
        spellId,
        success: true,
      };
      session.send(resultMessage);

      // Send success message
      sendSystemChatMessage(session, `You cast ${spellTemplate.name}!`);

      // Broadcast spell effect to nearby players
      if (spellEffects.length > 0) {
        const effectMessage: SpellEffectMessage = {
          type: "SPELL_EFFECT",
          timestamp: Date.now(),
          spellId,
          casterId: caster.id,
          targetEntityId: target?.id,
          targetPosition,
          effects: spellEffects,
        };

        // Broadcast to all nearby players (500px range for now)
        world.playerManager.broadcastToNearby(
          caster.id,
          effectMessage,
          500
        );
      }

      // TODO: Handle cast time and channeling in a separate system
      // For now, all spells are instant

    } catch (error) {
      console.error(`[SPELL] Error in cast spell handler:`, error);
      const errorMessage: SpellCastResultMessage = {
        type: "SPELL_CAST_RESULT",
        timestamp: Date.now(),
        spellId: message.spellId,
        success: false,
        reason: "server_error",
      };
      ctx.session.send(errorMessage);
    }
  }
);
