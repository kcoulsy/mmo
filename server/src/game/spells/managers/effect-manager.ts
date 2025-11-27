// Effect Manager - handles active spell effects (buffs, debuffs, DoTs, HoTs)

import { ActiveSpellEffect } from "@shared/spells";

export class EffectManager {
  // Track active effects by target entity
  private activeEffects: Map<string, ActiveSpellEffect[]> = new Map();
  private nextEffectId = 1;

  // Add an effect to an entity
  addEffect(effect: Omit<ActiveSpellEffect, "id">): string {
    const effectId = `effect_${this.nextEffectId++}`;
    const fullEffect: ActiveSpellEffect = {
      id: effectId,
      ...effect,
    };

    const targetEffects = this.activeEffects.get(effect.targetEntityId) || [];
    targetEffects.push(fullEffect);
    this.activeEffects.set(effect.targetEntityId, targetEffects);

    return effectId;
  }

  // Get all active effects on an entity
  getEffects(entityId: string): ActiveSpellEffect[] {
    return this.activeEffects.get(entityId) || [];
  }

  // Get specific effect by ID
  getEffect(effectId: string): ActiveSpellEffect | undefined {
    for (const effects of this.activeEffects.values()) {
      const effect = effects.find((e) => e.id === effectId);
      if (effect) return effect;
    }
    return undefined;
  }

  // Remove an effect by ID
  removeEffect(effectId: string): boolean {
    for (const [entityId, effects] of this.activeEffects.entries()) {
      const index = effects.findIndex((e) => e.id === effectId);
      if (index !== -1) {
        effects.splice(index, 1);
        if (effects.length === 0) {
          this.activeEffects.delete(entityId);
        }
        return true;
      }
    }
    return false;
  }

  // Update effects (called each game tick)
  // Returns array of expired effect IDs
  update(currentTime: number): string[] {
    const expiredEffects: string[] = [];

    for (const [entityId, effects] of this.activeEffects.entries()) {
      // Find expired effects
      const stillActive: ActiveSpellEffect[] = [];
      for (const effect of effects) {
        const elapsed = currentTime - effect.startTime;
        if (elapsed >= effect.duration) {
          expiredEffects.push(effect.id);
        } else {
          stillActive.push(effect);
        }
      }

      // Update or remove entity's effects
      if (stillActive.length > 0) {
        this.activeEffects.set(entityId, stillActive);
      } else {
        this.activeEffects.delete(entityId);
      }
    }

    return expiredEffects;
  }

  // Calculate total stat modifiers from all effects on an entity
  calculateStatModifiers(entityId: string): {
    moveSpeed: number;
    attack: number;
    defense: number;
  } {
    const effects = this.getEffects(entityId);
    const modifiers = {
      moveSpeed: 0,
      attack: 0,
      defense: 0,
    };

    for (const effect of effects) {
      if (effect.statModifiers) {
        modifiers.moveSpeed += effect.statModifiers.moveSpeed ?? 0;
        modifiers.attack += effect.statModifiers.attack ?? 0;
        modifiers.defense += effect.statModifiers.defense ?? 0;
      }
    }

    return modifiers;
  }

  // Check if entity has a specific buff type
  hasEffect(entityId: string, buffType: string): boolean {
    const effects = this.getEffects(entityId);
    return effects.some(
      (e) =>
        e.effectType === "buff" &&
        (e.spellId === buffType || e.spellId.includes(buffType))
    );
  }

  // Remove all effects from an entity
  clearEffects(entityId: string): void {
    this.activeEffects.delete(entityId);
  }

  // Remove all effects cast by a specific caster
  clearEffectsByCaster(casterId: string): void {
    for (const [entityId, effects] of this.activeEffects.entries()) {
      const remaining = effects.filter((e) => e.casterId !== casterId);
      if (remaining.length > 0) {
        this.activeEffects.set(entityId, remaining);
      } else {
        this.activeEffects.delete(entityId);
      }
    }
  }

  // Clear all effects (for testing/reset)
  clear(): void {
    this.activeEffects.clear();
    this.nextEffectId = 1;
  }
}

// Singleton instance
export const effectManager = new EffectManager();
