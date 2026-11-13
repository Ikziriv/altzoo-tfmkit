import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { Box3, CanvasTexture, Group, Matrix4, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { Species } from '../data/species';
import { useAtlas, type Rect } from '../store';
import { controls, emitViewChange } from './controls';
import { useSpeciesModel } from './model';
import { getStageMetrics, screenToWorld } from './stage';
import { HABITAT_SPECS } from './habitat/specs';
import { habitatZoom, restingCenterY, sampleTerrainY } from './habitat/placement';

/** Resting heading: mostly side-on facing right, turned a little toward the viewer. */
const REST_YAW = Math.PI / 2 - 0.55;

let shadowTexture: CanvasTexture | null = null;
function getShadowTexture() {
  if (shadowTexture) return shadowTexture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  shadowTexture = new CanvasTexture(c);
  return shadowTexture;
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

function bezier(out: Vector3, a: Vector3, c: Vector3, b: Vector3, t: number) {
  const u = 1 - t;
  out.set(
    u * u * a.x + 2 * u * t * c.x + t * t * b.x,
    u * u * a.y + 2 * u * t * c.y + t * t * b.y,
    u * u * a.z + 2 * u * t * c.z + t * t * b.z,
  );
  return out;
}

export interface ActorProps {
  species: Species;
  phase: 'enter' | 'exit';
  origin: Rect | null;
  exitDir: -1 | 1;
  reducedMotion: boolean;
  onExited: () => void;
}

export function Actor({ species, phase, origin, exitDir, reducedMotion, onExited }: ActorProps) {
  const model = useSpeciesModel(species);
  const { camera, size } = useThree();
  const theme = useAtlas((s) => s.theme);
  const isAerialOrMarine = species.model.kind === 'fly' || species.model.kind === 'swim';
  const isSwim = species.model.kind === 'swim';
  const habitat = HABITAT_SPECS[species.model.habitat ?? 'savanna'];
  const grounded = species.model.kind === 'walk';
  const specimenSize = grounded ? Math.min(species.model.size, 0.88 / model.height) : species.model.size;
  const groundY = habitat.hasWater ? habitat.waterY : sampleTerrainY(habitat, 0, 0);
  const placement = useMemo(() => ({
    bounds: new Box3(),
    heading: new Matrix4(),
    spin: new Matrix4(),
    target: new Vector3(),
  }), []);

  useEffect(() => {
    if (phase !== 'enter' || useAtlas.getState().activeId !== species.id) return;
    useAtlas.getState().setModelReady(true);
    useAtlas.getState().setModelError(null);
  }, [phase, species.id]);

  const travel = useRef<Group>(null!);
  const heading = useRef<Group>(null!);
  const spinRef = useRef<Group>(null!);
  const shadow = useRef<Mesh>(null!);

  const s = useRef({
    mode: 'enter' as 'enter' | 'idle' | 'exit',
    p: 0,
    start: new Vector3(),
    ctrl: new Vector3(),
    end: new Vector3(),
    pos: new Vector3(),
    prev: new Vector3(),
    scaleFrom: 1,
    scaleTo: 1,
    yaw: REST_YAW,
    spinY: 0,
    spinX: 0,
    zoom: 1,
    moveW: 1,
    seed: Math.random() * 10,
    tween: null as gsap.core.Tween | null,
  }).current;

  const shadowMaterial = useMemo(
    () => new MeshBasicMaterial({ map: getShadowTexture(), transparent: true, depthWrite: false }),
    [],
  );

  useEffect(() => () => shadowMaterial.dispose(), [shadowMaterial]);

  useEffect(() => {
    const night = theme === 'night';
    shadowMaterial.color.set(night ? '#080c10' : '#2b2416');
  }, [theme, shadowMaterial]);

  // Start animation clips. When idle and move share one clip we only vary its speed.
  useEffect(() => {
    model.idle?.reset().play();
    if (model.move && model.move !== model.idle) {
      model.move.reset().play();
      model.move.time = Math.random() * model.move.getClip().duration;
    }
  }, [model]);

  // Entrance: emerge from the clicked card (or walk in from the side on first load).
  useEffect(() => {
    const m = getStageMetrics(camera, size.width, size.height, performance.now());
    if (origin) {
      screenToWorld(origin.x + origin.width / 2, origin.y + origin.height / 2, camera, size.width, size.height, s.start);
      const top = screenToWorld(0, origin.y, camera, size.width, size.height).y;
      const bottom = screenToWorld(0, origin.y + origin.height, camera, size.width, size.height).y;
      s.scaleFrom = Math.min(0.45, Math.max(0.1, ((top - bottom) * 0.8) / (m.unit * specimenSize)));
    } else {
      s.start.set(m.leftEdge - m.unit * 0.4, m.anchor.y + (isAerialOrMarine ? m.unit * 0.6 : 0), 0);
      s.scaleFrom = 1;
    }
    s.scaleTo = 1;
    s.pos.copy(s.start);
    s.prev.copy(s.start);
    s.mode = 'enter';
    s.p = 0;
    if (reducedMotion) {
      s.pos.copy(m.anchor);
      if (grounded) s.pos.y += m.unit * restingCenterY(model.bounds.min.y, specimenSize, groundY, 1);
      s.prev.copy(m.anchor);
      s.mode = 'idle';
      s.p = 1;
      s.moveW = 0;
      return;
    }
    s.tween = gsap.to(s, {
      p: 1,
      duration: origin ? 0.95 : 1.2,
      delay: origin ? 0.05 : 0,
      ease: 'power3.out',
      onUpdate: emitViewChange,
      onComplete: () => {
        s.mode = 'idle';
      },
    });
    return () => {
      s.tween?.kill();
    };
    // Entrance runs once per actor instance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;
    s.tween?.kill();
    s.mode = 'idle';
    s.p = 1;
    s.moveW = 0;
  }, [reducedMotion, s]);

  // Exit: swoop off the nearest side, passing over the interface.
  useEffect(() => {
    if (phase !== 'exit') return;
    if (reducedMotion) {
      onExited();
      return;
    }
    const m = getStageMetrics(camera, size.width, size.height, performance.now());
    s.tween?.kill();
    s.scaleFrom = s.mode === 'idle' ? 1 : s.scaleFrom + (s.scaleTo - s.scaleFrom) * s.p;
    s.scaleTo = 1;
    s.mode = 'exit';
    s.p = 0;
    s.start.copy(s.pos);
    s.end.set(
      exitDir < 0 ? m.leftEdge - m.unit * 0.7 : m.rightEdge + m.unit * 0.7,
      isAerialOrMarine ? m.anchor.y + (isSwim ? m.unit * 0.35 : m.unit * 0.9) : m.anchor.y - m.unit * 0.05,
      m.unit * (isAerialOrMarine ? 0.6 : 1.1),
    );
    s.ctrl
      .copy(s.start)
      .lerp(s.end, 0.5)
      .add(new Vector3(0, isAerialOrMarine ? m.unit * 0.15 : m.unit * 0.04, m.unit * 0.8));
    s.tween = gsap.to(s, {
      p: 1,
      duration: 0.72,
      ease: 'power2.in',
      onUpdate: emitViewChange,
      onComplete: onExited,
    });
    return () => { s.tween?.kill(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, reducedMotion]);

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const m = getStageMetrics(camera, size.width, size.height, t);
    placement.target.copy(m.anchor);
    if (grounded) {
      placement.heading.makeRotationFromEuler(heading.current.rotation);
      placement.spin.makeRotationFromEuler(spinRef.current.rotation);
      placement.heading.multiply(placement.spin);
      placement.bounds.copy(model.bounds).applyMatrix4(placement.heading);
      placement.target.y += m.unit * restingCenterY(
        placement.bounds.min.y, specimenSize, groundY, controls.zoom,
      );
    } else {
      // Even a wide, shallow swimmer keeps visible clearance above reef rocks.
      placement.target.y += m.unit * Math.max(0, groundY + 0.2 - model.bounds.min.y * species.model.size);
    }

    // --- Position along the current path ---------------------------------
    if (s.mode === 'idle') {
      s.pos.lerp(placement.target, reducedMotion ? 1 : 1 - Math.exp(-dt * 6));
      if (grounded) s.pos.y = placement.target.y;
    } else if (s.mode === 'enter') {
      const side = Math.sign(s.start.x - m.anchor.x) || 1;
      s.ctrl
        .copy(s.start)
        .lerp(placement.target, 0.5)
        .add(
          new Vector3(
            side * m.unit * (isAerialOrMarine ? 0.5 : 0.3),
            isAerialOrMarine ? m.unit * (isSwim ? 0.18 : 0.3) : -m.unit * 0.12,
            m.unit * (isAerialOrMarine ? 0.7 : 1.0),
          ),
        );
      bezier(s.pos, s.start, s.ctrl, placement.target, s.p);
    } else {
      bezier(s.pos, s.start, s.ctrl, s.end, s.p);
    }

    const vx = (s.pos.x - s.prev.x) / dt;
    const vy = (s.pos.y - s.prev.y) / dt;
    const vz = (s.pos.z - s.prev.z) / dt;
    s.prev.copy(s.pos);
    const speed = Math.hypot(vx, vy, vz) / m.unit;
    const moving = s.mode !== 'idle' && speed > 0.08;

    // --- Heading follows the direction of travel, settles to rest pose ----
    const targetYaw = moving ? Math.atan2(vx, Math.max(-vy, 0) * 0.6 + Math.max(vz, 0) * 0.5 + 1e-4) : REST_YAW;
    const dYaw = wrapAngle(targetYaw - s.yaw);
    s.yaw += dYaw * (reducedMotion ? 1 : 1 - Math.exp(-dt * (moving ? 7 : 3.5)));
    heading.current.rotation.order = 'YXZ';
    heading.current.rotation.y = s.yaw;
    if (isAerialOrMarine) {
      const pitch = moving ? Math.max(-0.35, Math.min(0.35, -vy / m.unit * 0.12)) : 0;
      heading.current.rotation.x += (pitch - heading.current.rotation.x) * (1 - Math.exp(-dt * 4));
      heading.current.rotation.z += (-dYaw * 0.5 - heading.current.rotation.z) * (1 - Math.exp(-dt * 4));
    }

    // --- Blend idle / move animation -----------------------------------
    if (!reducedMotion) {
      s.moveW += ((moving ? 1 : 0) - s.moveW) * (1 - Math.exp(-dt * 5));
      const { idle, move } = model;
      if (idle && move && idle !== move) {
        idle.setEffectiveWeight(1 - s.moveW);
        move.setEffectiveWeight(s.moveW);
        idle.timeScale = species.model.idleTimeScale;
        move.timeScale = species.model.moveTimeScale;
      } else if (idle) {
        idle.timeScale =
          species.model.idleTimeScale + (species.model.moveTimeScale - species.model.idleTimeScale) * s.moveW;
      }
      model.mixer?.update(dt);
      model.update?.(t, dt, s.moveW);
    }

    // --- User rotation & zoom apply to the active animal only -------------
    if (phase === 'enter') {
      // Subtle cursor parallax when idle and not dragging
      const lookY = !reducedMotion && !controls.dragging && s.mode === 'idle' ? controls.pointerX * 0.14 : 0;
      const lookX = !reducedMotion && !controls.dragging && s.mode === 'idle' ? controls.pointerY * 0.08 : 0;
      const response = reducedMotion ? 1 : 1 - Math.exp(-dt * 12);
      s.spinY += (controls.rotY + lookY - s.spinY) * response;
      s.spinX += (controls.rotX + lookX - s.spinX) * response;
      s.zoom = controls.zoom;
    }
    spinRef.current.rotation.set(s.spinX, s.spinY, 0);
    const breathe = reducedMotion || isAerialOrMarine ? 1 : 1 + Math.sin(t * 2.1 + s.seed) * 0.006;
    spinRef.current.scale.set(s.zoom, s.zoom * breathe, s.zoom);

    // --- Place and scale the whole rig ---------------------------------
    const scaleP = s.mode === 'enter' ? 1 - Math.pow(1 - s.p, 2.2) : s.p;
    const settle =
      s.mode === 'enter' && s.p > 0.72 && !reducedMotion
        ? Math.sin(((s.p - 0.72) / 0.28) * Math.PI) * (grounded ? 0.032 : 0.022)
        : 0;
    const travelScale = (s.mode === 'idle' ? 1 : s.scaleFrom + (s.scaleTo - s.scaleFrom) * scaleP) * (1 + settle);
    const base = m.unit * specimenSize;
    travel.current.position.copy(s.pos);
    if (!grounded && !reducedMotion) {
      const floatAmp = isSwim ? 0.042 : 0.035;
      travel.current.position.y += Math.sin(t * 1.6 + s.seed) * m.unit * floatAmp * (1 - s.moveW * 0.7);
    }
    travel.current.scale.setScalar(base * travelScale);

    // --- Ground shadow / night glow -----------------------------------
    shadow.current.position.set(
      s.pos.x, m.anchor.y + m.unit * groundY * habitatZoom(controls.zoom) + m.unit * 0.003, s.pos.z,
    );
    shadow.current.scale.set(
      base * 0.8 * Math.min(s.zoom, 1.6), base * 0.45 * Math.min(s.zoom, 1.6), 1,
    );
    const travelFade = s.mode === 'enter' ? smoothstep(0.65, 1, s.p) : s.mode === 'exit' ? 1 - s.p : 1;
    const baseOpacity = theme === 'night' ? 0.16 : grounded ? 0.22 : 0.07;
    shadowMaterial.opacity = baseOpacity * travelFade * (1 - smoothstep(1.25, 1.9, s.zoom));
  });

  return (
    <group name={`specimen-${species.id}`}>
      <group ref={travel} name="specimen-travel">
        <group ref={heading}>
          <group ref={spinRef}>
            <primitive object={model.root} />
          </group>
        </group>
      </group>
      <mesh ref={shadow} material={shadowMaterial} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1, 1]} />
      </mesh>
    </group>
  );
}
