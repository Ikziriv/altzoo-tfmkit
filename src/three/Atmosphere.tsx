import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture, InstancedMesh, NormalBlending, Object3D } from 'three';
import { byId } from '../data/species';
import { useAtlas } from '../store';
import { getStageMetrics } from './stage';

const COUNT = 44;

let dotTex: CanvasTexture | null = null;
function getDotTexture() {
  if (dotTex) return dotTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  dotTex = new CanvasTexture(c);
  return dotTex;
}

interface Particle {
  x: number;
  y: number;
  z: number;
  speed: number;
  phase: number;
  size: number;
}

/**
 * Floating atmospheric particles around the stage:
 * - Day: subtle warm pollen/dust motes drifting in the sunbeam
 * - Night Safari: glowing amber fireflies pulsing gently in the dark
 */
export function Atmosphere() {
  const theme = useAtlas((s) => s.theme);
  const habitat = useAtlas((s) => byId(s.activeId).model.habitat);
  const meshRef = useRef<InstancedMesh>(null!);
  const { camera, size } = useThree();
  const dummy = useMemo(() => new Object3D(), []);
  const marine = habitat === 'reef' || habitat === 'abyss';

  const particles = useMemo<Particle[]>(
    () =>
      Array.from({ length: COUNT }, (_, i) => ({
        x: (Math.sin(i * 12.9898) - 0.5) * 2.4,
        y: (Math.cos(i * 78.233) - 0.5) * 1.6,
        z: (Math.sin(i * 37.719) - 0.5) * 1.4,
        speed: 0.25 + (i % 7) * 0.06,
        phase: i * 1.37,
        size: 0.018 + (i % 5) * 0.006,
      })),
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const m = getStageMetrics(camera, size.width, size.height, t);
    const night = theme === 'night';

    for (let i = 0; i < COUNT; i++) {
      const p = particles[i];
      // Marine habitats: bubbles/plankton rise steadily with a tighter drift.
      const sway = marine ? 0.08 : 0.18;
      const rise = marine ? 0.34 : 0.22;
      const wx = m.anchor.x + (p.x + Math.sin(t * p.speed + p.phase) * sway) * m.unit;
      const wy = m.anchor.y + (p.y + ((t * p.speed * rise + p.phase) % 1.6) - 0.8) * m.unit;
      const wz = p.z * m.unit;
      const pulse = night ? 0.45 + 0.55 * Math.max(0, Math.sin(t * 2.4 + p.phase)) : 0.6 + 0.4 * Math.sin(t * 1.1 + p.phase);
      const s = p.size * m.unit * (night ? 1.35 : marine ? 0.7 : 0.85) * pulse;
      dummy.position.set(wx, wy, wz);
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  const night = theme === 'night';
  const color = night ? (marine ? '#5fc8e0' : '#f6b84c') : marine ? '#9fc8d8' : '#c89b56';
  const additive = night || habitat === 'abyss';
  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} renderOrder={-2}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={getDotTexture()}
        color={color}
        transparent
        opacity={night ? 0.55 : marine ? 0.32 : 0.22}
        depthWrite={false}
        blending={additive ? AdditiveBlending : NormalBlending}
      />
    </instancedMesh>
  );
}

