export interface Position {
    readonly type: 'position';
    x: number;
    y: number;
    z?: number;
}
export interface Velocity {
    readonly type: 'velocity';
    vx: number;
    vy: number;
}
export interface Renderable {
    readonly type: 'renderable';
    spriteId: string;
    layer: number;
    frame: number;
    scale?: number;
    rotation?: number;
}
export interface Collider {
    readonly type: 'collider';
    shape: 'circle' | 'rectangle' | 'polygon';
    width?: number;
    height?: number;
    radius?: number;
    points?: Array<{
        x: number;
        y: number;
    }>;
}
export interface Stats {
    readonly type: 'stats';
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    attack: number;
    defense: number;
    moveSpeed: number;
}
export interface Inventory {
    readonly type: 'inventory';
    slots: Array<ItemStack | null>;
    maxSlots: number;
}
export interface Equipment {
    readonly type: 'equipment';
    head?: ItemStack;
    chest?: ItemStack;
    legs?: ItemStack;
    hands?: ItemStack;
    feet?: ItemStack;
    weapon?: ItemStack;
    offHand?: ItemStack;
    jewelry1?: ItemStack;
    jewelry2?: ItemStack;
    cloak?: ItemStack;
    bag?: ItemStack;
}
export interface SkillSet {
    readonly type: 'skillSet';
    skills: Map<string, {
        xp: number;
        level: number;
    }>;
}
export interface Lootable {
    readonly type: 'lootable';
    drops: DropTableEntry[];
}
export interface NavAgent {
    readonly type: 'navAgent';
    destination?: {
        x: number;
        y: number;
    };
    path: Array<{
        x: number;
        y: number;
    }>;
    state: 'idle' | 'moving' | 'pathfinding';
    speed: number;
}
export interface ItemStack {
    itemId: string;
    quantity: number;
    durability?: number;
}
export interface DropTableEntry {
    itemId: string;
    chance: number;
    minQuantity: number;
    maxQuantity: number;
}
export type Component = Position | Velocity | Renderable | Collider | Stats | Inventory | Equipment | SkillSet | Lootable | NavAgent;
//# sourceMappingURL=components.d.ts.map