import { Component, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Group, PerspectiveCamera, Vector3 } from 'three';
import { byId } from '../data/species';
import { useSpeciesModel } from './model';
import { SpecimenLighting } from './SpecimenLighting';

class SnapshotBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    document.body.dataset.error = error.message;
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/** Dev-only route (`?snap=<id>`) used to capture consistent transparent thumbnails. */
function SnapModel({ id, yaw }: { id: string; yaw?: number }) {
  const species = byId(id);
  const model = useSpeciesModel(species);
  const group = useRef<Group>(null!);
  const frames = useRef(0);
  const camera = useThree((state) => state.camera) as PerspectiveCamera;
  const isFloat = species.model.kind !== 'walk';
  const rotationY = Number.isFinite(yaw) ? yaw! : species.thumbnail?.yaw ?? 1;
  const pitch = species.thumbnail?.pitch ?? (isFloat ? 0.25 : 0.14);
  const time = species.thumbnail?.time ?? 0.6;
  const fit = species.thumbnail?.fit ?? 0.76;

  useEffect(() => {
    delete document.body.dataset.ready;
    delete document.body.dataset.error;
    model.idle?.reset().play();
    model.mixer?.update(time);
    model.update?.(time, 0.016, 0);

    const root = group.current;
    root.scale.setScalar(1);
    root.position.set(0, 0, 0);
    root.updateMatrixWorld(true);
    const bounds = model.bounds.clone().applyMatrix4(root.matrixWorld);
    if (bounds.isEmpty()) throw new Error(`No geometry available for ${species.id}`);

    const size = bounds.getSize(new Vector3());
    const worldHeight = 2 * Math.tan((camera.fov * Math.PI) / 360) * camera.position.z;
    const worldWidth = worldHeight * camera.aspect;
    const scale = Math.min((worldWidth * fit) / Math.max(size.x, 0.001), (worldHeight * fit) / Math.max(size.y, 0.001));
    const center = bounds.getCenter(new Vector3()).multiplyScalar(scale).negate();
    root.scale.setScalar(scale);
    root.position.copy(center);
    root.updateMatrixWorld(true);
  }, [model, camera, species.id, time, fit]);

  useFrame(() => {
    frames.current += 1;
    if (frames.current === 4) document.body.dataset.ready = 'true';
  });

  return (
    <group ref={group} rotation={[pitch, rotationY, 0]}>
      <primitive object={model.root} />
    </group>
  );
}

export function SnapScene({ id, yaw }: { id: string; yaw?: number }) {
  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      <style>{`html, body, #root { background: transparent !important; }`}</style>
      <Canvas
        frameloop="always"
        dpr={1}
        camera={{ fov: 30, position: [0, 0, 14], near: 0.1, far: 100 }}
        gl={{ alpha: true, antialias: true, preserveDrawingBuffer: true }}
      >
        <SpecimenLighting theme="day" habitatOverride={byId(id).model.habitat ?? 'savanna'} />
        <SnapshotBoundary key={id}>
          <Suspense fallback={null}>
            <SnapModel id={id} yaw={yaw} />
          </Suspense>
        </SnapshotBoundary>
      </Canvas>
    </div>
  );
}
