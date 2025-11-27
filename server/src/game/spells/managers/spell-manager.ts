// Spell Manager - handles spell lookups, cooldowns, and player spellbooks

import { PlayerSpell, SpellTemplate } from "@shared/spells";

export class SpellManager {
  // Track player spellbooks: playerId -> spellId -> PlayerSpell
  private playerSpellbooks: Map<string, Map<string, PlayerSpell>> = new Map();

  // Initialize a player's spellbook
  initializePlayerSpellbook(playerId: string, level: number): void {
    if (!this.playerSpellbooks.has(playerId)) {
      this.playerSpellbooks.set(playerId, new Map());
    }

    // Give player basic spells based on level
    // For now, give all spells they've unlocked
    Object.values(SPELL_TEMPLATES).forEach((spell) => {
      if (spell.unlocksAtLevel && spell.unlocksAtLevel <= level) {
        this.learnSpell(playerId, spell.id);
      }
    });
  }

  // Learn a spell
  learnSpell(playerId: string, spellId: string): boolean {
    const template = getSpellTemplate(spellId);
    if (!template) {
      console.error(`Cannot learn unknown spell: ${spellId}`);
      return false;
    }

    const spellbook = this.playerSpellbooks.get(playerId);
    if (!spellbook) {
      console.error(`Player ${playerId} has no spellbook`);
      return false;
    }

    // Check if already knows spell
    if (spellbook.has(spellId)) {
      return false;
    }

    // Add spell to spellbook
    spellbook.set(spellId, {
      spellId,
      level: 1,
      experience: 0,
      cooldownUntil: 0,
    });

    return true;
  }

  // Check if player knows a spell
  knowsSpell(playerId: string, spellId: string): boolean {
    const spellbook = this.playerSpellbooks.get(playerId);
    return spellbook?.has(spellId) ?? false;
  }

  // Get player spell data
  getPlayerSpell(playerId: string, spellId: string): PlayerSpell | undefined {
    return this.playerSpellbooks.get(playerId)?.get(spellId);
  }

  // Get all spells player knows
  getPlayerSpells(playerId: string): PlayerSpell[] {
    const spellbook = this.playerSpellbooks.get(playerId);
    if (!spellbook) return [];
    return Array.from(spellbook.values());
  }

  // Check if spell is on cooldown
  isOnCooldown(playerId: string, spellId: string): boolean {
    const playerSpell = this.getPlayerSpell(playerId, spellId);
    if (!playerSpell) return false;

    return Date.now() < playerSpell.cooldownUntil;
  }

  // Get remaining cooldown in milliseconds
  getCooldownRemaining(playerId: string, spellId: string): number {
    const playerSpell = this.getPlayerSpell(playerId, spellId);
    if (!playerSpell) return 0;

    const remaining = playerSpell.cooldownUntil - Date.now();
    return Math.max(0, remaining);
  }

  // Start cooldown for a spell
  startCooldown(playerId: string, spellId: string): void {
    const playerSpell = this.getPlayerSpell(playerId, spellId);
    const template = getSpellTemplate(spellId);

    if (!playerSpell || !template) return;

    playerSpell.cooldownUntil = Date.now() + template.cooldown;
  }

  // Validate if a spell can be cast
  canCastSpell(
    playerId: string,
    spellId: string,
    currentMana: number
  ): { canCast: boolean; reason?: string } {
    // Check if spell exists
    const template = getSpellTemplate(spellId);
    if (!template) {
      return { canCast: false, reason: "unknown_spell" };
    }

    // Check if player knows the spell
    if (!this.knowsSpell(playerId, spellId)) {
      return { canCast: false, reason: "spell_not_learned" };
    }

    // Check cooldown
    if (this.isOnCooldown(playerId, spellId)) {
      return { canCast: false, reason: "on_cooldown" };
    }

    // Check mana cost
    if (currentMana < template.manaCost) {
      return { canCast: false, reason: "insufficient_mana" };
    }

    return { canCast: true };
  }

  // Remove player spellbook (on disconnect)
  removePlayer(playerId: string): void {
    this.playerSpellbooks.delete(playerId);
  }

  // Clear all data (for testing/reset)
  clear(): void {
    this.playerSpellbooks.clear();
  }
}

// Singleton instance
export const spellManager = new SpellManager();
