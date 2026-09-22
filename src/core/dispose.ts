import type { BufferGeometry, Material, Object3D } from 'three';
import { Line, Mesh } from 'three';

/** Frees the GPU resources of an object tree and detaches it from its parent. */
export function disposeObject(root: Object3D): void {
  root.traverse((node) => {
    if (node instanceof Mesh || node instanceof Line) {
      (node.geometry as BufferGeometry).dispose();
      const material = node.material as Material | Material[];
      for (const m of Array.isArray(material) ? material : [material]) m.dispose();
    }
  });
  root.removeFromParent();
}
