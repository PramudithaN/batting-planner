import type * as THREE from 'three';

/**
 * Removes all child meshes from a Three.js Group and disposes their geometries and materials.
 */
export function disposeThreeGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0] as THREE.Mesh;
    group.remove(child);
    child.geometry?.dispose();
    if (Array.isArray(child.material)) {
      child.material.forEach((m) => m.dispose());
    } else {
      child.material?.dispose();
    }
  }
}
