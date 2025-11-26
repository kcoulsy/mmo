import { EntityId, Component } from './index';
export interface Entity {
    id: EntityId;
    components: Map<string, Component>;
}
export declare function createEntity(id: EntityId): Entity;
export declare function addComponentToEntity(entity: Entity, component: Component): void;
export declare function removeComponentFromEntity(entity: Entity, componentType: string): void;
export declare function getComponentFromEntity<T extends Component>(entity: Entity, componentType: string): T | undefined;
export declare function hasComponent(entity: Entity, componentType: string): boolean;
//# sourceMappingURL=entity.d.ts.map