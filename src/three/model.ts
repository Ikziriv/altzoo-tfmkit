import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { AnimationAction, AnimationMixer, Box3, Group, LoopRepeat, Mesh, MeshStandardMaterial, Object3D, SRGBColorSpace, Texture, Vector3 } from 'three';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { Species } from '../data/species';
import { createProceduralAnimal, type ProceduralId } from './procedural';

export interface LoadedModel {
  /** Normalised root: centred on its bounding box, largest dimension = 1. */
  root: Group;
  /** Height of the normalised model (0..1). */
  height: number;
  bounds: Box3;
  mixer?: AnimationMixer;
  idle: AnimationAction | null;
  move: AnimationAction | null;
  update?: (t: number, dt: number, moveW: number) => void;
}

const retainedModels = new Map<string, Group>();

function prepareMaterials(root: Group, species?: Species) {
  const kind = species?.model.kind ?? 'walk';
  const id = species?.id ?? '';
  const isFur = id === 'fox' || id === 'horse' || id === 'giraffe' || id === 'wolf' || id === 'stag' || id === 'zebra' || id === 'panda';
  const isWet = kind === 'swim' || id === 'chameleon' || id === 'flamingo' || id === 'treefrog';
  const isGelatinous = id === 'jellyfish' || id === 'dumbo';

  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.layers.set(0);

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      if (!(material as MeshStandardMaterial).isMeshStandardMaterial) continue;
      const std = material as MeshStandardMaterial;
      if (std.map) std.map.colorSpace = SRGBColorSpace;
      std.metalness = 0.02;
      std.roughness = isGelatinous ? 0.2 : isWet ? 0.38 : isFur ? 0.72 : 0.58;
      std.envMapIntensity = isWet ? 1.25 : 0.98;
      if (std.name === 'Light') {
        std.emissiveIntensity = 2.4;
        std.roughness = 0.12;
      }
      std.needsUpdate = true;
    }
  });
}

function disposeModel(root: Object3D) {
  const textures = new Set<Texture>();
  root.traverse((object) => {
    const mesh = object as Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) {
        if ((value as Texture)?.isTexture) textures.add(value as Texture);
      }
      material.dispose();
    }
  });
  textures.forEach((texture) => texture.dispose());
}

function retainModel(url: string, scene: Group) {
  retainedModels.delete(url);
  retainedModels.set(url, scene);
  if (retainedModels.size <= 8) return;

  for (const [oldUrl, oldScene] of retainedModels) {
    if (oldUrl === url) continue;
    retainedModels.delete(oldUrl);
    useGLTF.clear(oldUrl);
    disposeModel(oldScene);
    break;
  }
}

export function useSpeciesModel(species: Species): LoadedModel {
  if (species.model.procedural) {
    // Each species instance uses a consistent loading strategy; branching by species.model.procedural is stable per Actor.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useProceduralModel(species.model.procedural, species.model.forwardYaw);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGltfModel(species);
}

function useProceduralModel(id: ProceduralId, forwardYaw: number): LoadedModel {
  const loaded = useMemo<LoadedModel>(() => {
    const rig = createProceduralAnimal(id);
    const yaw = new Group();
    yaw.rotation.y = forwardYaw;
    yaw.add(rig.root);

    const root = new Group();
    root.add(yaw);
    root.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(rig.root).applyMatrix4(yaw.matrixWorld);
    prepareMaterials(root);

    return {
      root,
      height: rig.height,
      bounds,
      idle: null,
      move: null,
      update: rig.update,
    };
  }, [id, forwardYaw]);

  useEffect(() => () => disposeModel(loaded.root), [loaded]);
  return loaded;
}

/**
 * Loads a species GLB, clones it (so several instances can coexist during a
 * hand-off), normalises its size and prepares idle/move animation actions.
 */
function useGltfModel(species: Species): LoadedModel {
  const width = useThree((state) => state.size.width);
  const url = width < 820 && species.model.mobileUrl ? species.model.mobileUrl : species.model.url!;
  const { scene, animations } = useGLTF(url);

  useEffect(() => {
    retainModel(url, scene);
  }, [url, scene]);

  const loaded = useMemo<LoadedModel>(() => {
    const instance = cloneSkinned(scene) as Group;
    instance.traverse((o) => {
      if ((o as Mesh).isMesh) {
        // Skinned and morphing meshes keep their bind-pose bounds, which makes culling unreliable.
        o.frustumCulled = false;
      }
    });
    prepareMaterials(instance, species);
    if (species.model.opacity !== undefined) {
      instance.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const m of mats) {
          const std = m as MeshStandardMaterial;
          std.transparent = true;
          std.opacity = species.model.opacity!;
        }
      });
    }

    const mixer = new AnimationMixer(instance);
    const findClip = (name?: string) =>
      (name && animations.find((a) => a.name === name)) || animations[0] || null;
    const idleClip = findClip(species.model.idleClip);
    const moveClip = findClip(species.model.moveClip);
    const idle = idleClip ? mixer.clipAction(idleClip) : null;
    const move = moveClip ? mixer.clipAction(moveClip) : null;
    [idle, move].forEach((a) => a?.setLoop(LoopRepeat, Infinity));

    // Sample the idle clip and measure actual vertex positions (including morph targets)
    // so morph-animated models like Horse/Flamingo/Parrot/Stork normalise to their true size.
    if (idle) {
      idle.reset().play();
      mixer.update(0.25);
    }
    instance.updateMatrixWorld(true);

    const box = new Box3();
    const v = new Vector3();
    instance.traverse((o) => {
      const m = o as Mesh;
      if (!m.isMesh || !m.geometry?.attributes.position) return;
      const pos = m.geometry.attributes.position;
      const morphs = m.geometry.morphAttributes.position;
      const inf = m.morphTargetInfluences;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        if (morphs && inf) {
          for (let j = 0; j < morphs.length; j++) {
            const w = inf[j] ?? 0;
            if (w) {
              v.x += morphs[j].getX(i) * w;
              v.y += morphs[j].getY(i) * w;
              v.z += morphs[j].getZ(i) * w;
            }
          }
        }
        v.applyMatrix4(m.matrixWorld);
        box.expandByPoint(v);
      }
    });
    if (box.isEmpty()) box.setFromObject(instance);

    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    instance.position.sub(center);
    box.translate(center.clone().negate());

    const yaw = new Group();
    yaw.rotation.y = species.model.forwardYaw;
    yaw.add(instance);

    const root = new Group();
    root.scale.setScalar(1 / maxDim);
    root.add(yaw);
    root.updateMatrixWorld(true);
    box.applyMatrix4(yaw.matrixWorld);

    // Subtle procedural motion for static GLBs that have no clips
    const isStatic = animations.length === 0;

    return {
      root,
      height: size.y / maxDim,
      bounds: box,
      mixer,
      idle,
      move,
      update: isStatic
        ? species.model.kind === 'walk'
          ? (t, _dt, moveW) => {
              const rate = 2.6 + moveW * 2.2;
              yaw.rotation.z = Math.sin(t * rate) * (0.003 + moveW * 0.03);
              yaw.position.y = Math.abs(Math.sin(t * rate * 2)) * 0.025 * moveW;
            }
          : (t, _dt, moveW) => {
              const rate = 3.2 + moveW * 2.4;
              yaw.rotation.y = species.model.forwardYaw + Math.sin(t * rate) * (0.09 + moveW * 0.08);
              yaw.rotation.z = Math.cos(t * rate * 0.5) * 0.03;
              if (species.model.pulse) {
                const s = Math.sin(t * (2.4 + moveW * 2.2)) * 0.05;
                yaw.scale.set(1 - s * 0.5, 1 + s, 1 - s * 0.5);
              }
            }
        : undefined,
    };
  }, [scene, animations, species]);

  useEffect(
    () => () => {
      loaded.mixer?.stopAllAction();
    },
    [loaded],
  );

  return loaded;
}
