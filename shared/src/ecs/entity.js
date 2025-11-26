"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEntity = createEntity;
exports.addComponentToEntity = addComponentToEntity;
exports.removeComponentFromEntity = removeComponentFromEntity;
exports.getComponentFromEntity = getComponentFromEntity;
exports.hasComponent = hasComponent;
// Entity creation utilities
function createEntity(id) {
    return {
        id,
        components: new Map()
    };
}
function addComponentToEntity(entity, component) {
    entity.components.set(component.type, component);
}
function removeComponentFromEntity(entity, componentType) {
    entity.components.delete(componentType);
}
function getComponentFromEntity(entity, componentType) {
    return entity.components.get(componentType);
}
function hasComponent(entity, componentType) {
    return entity.components.has(componentType);
}
//# sourceMappingURL=entity.js.map