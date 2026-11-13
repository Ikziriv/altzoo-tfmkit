import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import { CircleGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { byId, type Species } from '../data/species';
import { useSpeciesModel } from './model';
import { sampleTerrainY } from './habitat/placement';
import type { HabitatSpec } from './habitat/specs';

interface ZooCrowdProps {
  spec: HabitatSpec;
  speciesIds: string[];
  playing: boolean;
  reducedMotion: boolean;
}

class WalkerBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  let diff = (target - current) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

function seededSpawn(index: number, total: number, id: string): { x: number; z: number } {
  const angle = (index / Math.max(1, total)) * Math.PI * 2 + hashSeed(id) * 0.7;
  const radius = total === 1 ? 0.2 : 0.55 + (index % 2) * 0.35;
  return {
    x: Math.cos(angle) * radius * 1.1,
    z: Math.sin(angle) * radius * 0.72 - 0.08,
  };
}

function randomWaypoint(id: string, step: number): { x: number; z: number } {
  const a = hashSeed(`${id}:a:${step}`) * Math.PI * 2;
  const r = 0.25 + hashSeed(`${id}:r:${step}`) * 1.05;
  return {
    x: Math.cos(a) * r * 1.15,
    z: Math.sin(a) * r * 0.72 - 0.08,
  };
}

function ZooWalker({
  species,
  index,
  total,
  spec,
  playing,
  reducedMotion,
  positions,
}: {
  species: Species;
  index: number;
  total: number;
  spec: HabitatSpec;
  playing: boolean;
  reducedMotion: boolean;
  positions: React.MutableRefObject<Map<string, Vector3>>;
}) {
  const model = useSpeciesModel(species);
  const groupRef = useRef<Group>(null!);
  const bodyRef = useRef<Group>(null!);
  const shadowRef = useRef<Mesh>(null!);

  const spawn = useMemo(() => seededSpawn(index, total, species.id), [index, total, species.id]);
  const animalScale = Math.min(species.model.size * 0.65, 0.7);
  const kind = species.model.kind;
  const minY = model.bounds.min.y;

  const stateRef = useRef({
    x: spawn.x,
    z: spawn.z,
    y: sampleTerrainY(spec, spawn.x, spawn.z) - minY * animalScale,
    yaw: hashSeed(species.id) * Math.PI * 2,
    pitch: 0,
    tx: spawn.x,
    tz: spawn.z,
    step: 1,
    mode: 'walk' as 'walk' | 'graze',
    timer: 0.4 + hashSeed(species.id) * 1.4,
    activeAnim: 'idle' as 'idle' | 'walk',
  });

  useEffect(() => {
    const s = stateRef.current;
    s.x = spawn.x;
    s.z = spawn.z;
    const nextWp = randomWaypoint(species.id, s.step++);
    s.tx = nextWp.x;
    s.tz = nextWp.z;
    positions.current.set(species.id, new Vector3(s.x, s.y, s.z));
    return () => {
      positions.current.delete(species.id);
    };
  }, [species.id, spawn.x, spawn.z, positions]);

  const shadowGeo = useMemo(() => new CircleGeometry(Math.max(0.12, 0.24 * animalScale), 20), [animalScale]);
  const shadowMat = useMemo(
    () => new MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }),
    [],
  );

  useEffect(() => () => {
    shadowGeo.dispose();
    shadowMat.dispose();
  }, [shadowGeo, shadowMat]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const s = stateRef.current;
    const isMoving = playing && !reducedMotion && s.mode === 'walk';

    // 1. State machine: walk <-> graze
    if (playing && !reducedMotion) {
      s.timer -= dt;
      const distToTarget = Math.hypot(s.tx - s.x, s.tz - s.z);
      if (s.mode === 'walk' && (distToTarget < 0.14 || s.timer <= 0)) {
        s.mode = 'graze';
        s.timer = 1.4 + hashSeed(`${species.id}:g:${s.step}`) * 2.2;
      } else if (s.mode === 'graze' && s.timer <= 0) {
        const wp = randomWaypoint(species.id, s.step++);
        s.tx = wp.x;
        s.tz = wp.z;
        s.mode = 'walk';
        s.timer = 4.0 + hashSeed(`${species.id}:w:${s.step}`) * 3.0;
      }
    }

    // 2. Steering & separation
    if (isMoving) {
      let vx = s.tx - s.x;
      let vz = s.tz - s.z;
      const len = Math.hypot(vx, vz) || 1;
      vx /= len;
      vz /= len;

      for (const [otherId, otherPos] of positions.current) {
        if (otherId === species.id) continue;
        const dx = s.x - otherPos.x;
        const dz = s.z - otherPos.z;
        const d = Math.hypot(dx, dz);
        const minDist = 0.68;
        if (d > 0.001 && d < minDist) {
          const push = ((minDist - d) / minDist) * 1.65;
          vx += (dx / d) * push;
          vz += (dz / d) * push;
        }
      }

      const vLen = Math.hypot(vx, vz) || 1;
      vx /= vLen;
      vz /= vLen;

      const speed = kind === 'swim' ? 0.48 : kind === 'fly' ? 0.56 : 0.38;
      s.x = Math.max(-1.35, Math.min(1.35, s.x + vx * speed * dt));
      s.z = Math.max(-0.95, Math.min(0.85, s.z + vz * speed * dt));

      const targetYaw = Math.atan2(vx, vz);
      s.yaw = dampAngle(s.yaw, targetYaw, 5.5, dt);
    }

    // 3. Terrain grounding & slope pitch
    const groundY = sampleTerrainY(spec, s.x, s.z);
    let targetY = groundY - minY * animalScale;
    let targetPitch = 0;

    if (kind === 'swim') {
      targetY = groundY + 0.42 + Math.sin(t * 1.4 + index * 1.7) * 0.12;
      targetPitch = Math.cos(t * 1.4 + index * 1.7) * 0.08;
    } else if (kind === 'fly') {
      targetY = groundY + 0.68 + Math.sin(t * 1.9 + index * 1.3) * 0.1;
      targetPitch = -0.06;
    } else {
      const lookX = s.x + Math.sin(s.yaw) * 0.18;
      const lookZ = s.z + Math.cos(s.yaw) * 0.18;
      const aheadY = sampleTerrainY(spec, lookX, lookZ);
      targetPitch = Math.max(-0.2, Math.min(0.2, -(aheadY - groundY) * 1.6));
    }

    const kY = 1 - Math.exp(-10 * dt);
    s.y += (targetY - s.y) * kY;
    s.pitch += (targetPitch - s.pitch) * kY;

    positions.current.set(species.id, new Vector3(s.x, s.y, s.z));

    // 4. Apply transforms
    if (groupRef.current) {
      groupRef.current.position.set(s.x, s.y, s.z);
      groupRef.current.rotation.set(s.pitch, s.yaw, 0);
    }

    if (bodyRef.current) {
      const hasWalkClip = Boolean(model.move && model.move !== model.idle);
      const bobAmp = isMoving ? (hasWalkClip ? 0.008 : 0.024) : 0;
      const strideFreq = kind === 'swim' ? 4 : 7.5;
      bodyRef.current.position.y = Math.abs(Math.sin(t * strideFreq + index)) * bobAmp;
      bodyRef.current.rotation.z = isMoving && !hasWalkClip ? Math.sin(t * strideFreq + index) * 0.035 : 0;
    }

    if (shadowRef.current) {
      shadowRef.current.position.set(s.x, groundY + 0.012, s.z);
      shadowRef.current.visible = kind === 'walk';
    }

    // 5. Skeletal / procedural animation playback
    if (model.mixer) {
      const wantAnim = isMoving ? 'walk' : 'idle';
      if (wantAnim !== s.activeAnim && model.move && model.idle) {
        if (model.move !== model.idle) {
          const from = wantAnim === 'walk' ? model.idle : model.move;
          const to = wantAnim === 'walk' ? model.move : model.idle;
          to.reset().play();
          from.crossFadeTo(to, 0.35, true);
        }
        s.activeAnim = wantAnim;
      }
      if (playing && !reducedMotion) {
        model.mixer.update(dt * (isMoving ? 1.1 : 0.75));
      }
    }

    if (model.update) {
      model.update(t, dt, isMoving ? 1 : 0.15);
    }
  });

  return (
    <>
      <group ref={groupRef} position={[spawn.x, sampleTerrainY(spec, spawn.x, spawn.z) - minY * animalScale, spawn.z]}>
        <group ref={bodyRef} scale={animalScale}>
          <primitive object={model.root} />
        </group>
      </group>
      <mesh
        ref={shadowRef}
        geometry={shadowGeo}
        material={shadowMat}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[spawn.x, sampleTerrainY(spec, spawn.x, spawn.z) + 0.012, spawn.z]}
      />
    </>
  );
}

export function ZooCrowd({ spec, speciesIds, playing, reducedMotion }: ZooCrowdProps) {
  const positions = useRef<Map<string, Vector3>>(new Map());

  return (
    <group name="zoo-crowd">
      {speciesIds.map((id, index) => (
        <WalkerBoundary key={id}>
          <Suspense fallback={null}>
            <ZooWalker
              species={byId(id)}
              index={index}
              total={speciesIds.length}
              spec={spec}
              playing={playing}
              reducedMotion={reducedMotion}
              positions={positions}
            />
          </Suspense>
        </WalkerBoundary>
      ))}
    </group>
  );
}
