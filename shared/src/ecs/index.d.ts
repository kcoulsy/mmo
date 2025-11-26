export * from "./components";
export * from "./entity";
export type EntityId = string;
export interface Component {
    readonly type: string;
}
export interface System {
    update(entities: Map<EntityId, any>, deltaTime: number): void;
}
export interface World {
    createEntity(): EntityId;
    destroyEntity(entityId: EntityId): void;
    addComponent<T extends Component>(entityId: EntityId, component: T): void;
    removeComponent(entityId: EntityId, componentType: string): void;
    getComponent<T extends Component>(entityId: EntityId, componentType: string): T | undefined;
    hasComponent(entityId: EntityId, componentType: string): boolean;
    getEntitiesWithComponent(componentType: string): EntityId[];
    update(deltaTime: number): void;
}
//# sourceMappingURL=index.d.ts.map