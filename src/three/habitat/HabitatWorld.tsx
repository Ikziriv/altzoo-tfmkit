import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { Group, Vector4 } from 'three';
import { byId } from '../../data/species';
import { useAtlas } from '../../store';
import { controls, emitViewChange } from '../controls';
import { getStageMetrics, stageElement } from '../stage';
import { Biome, WORLD_LAYER } from './Biome';
import { HABITAT_SPECS, type HabitatId } from './specs';
import { habitatZoom } from './placement';
import type { HabitatReveal } from './reveal';
import { ZooCrowd } from '../ZooCrowd';

/**
 * Persistent stage-anchored 3D biome world & vitrine renderer.
 *
 * Architectural separation:
 * 1. Anchored to `getStageMetrics().anchor` and scaled ONLY by `m.unit` (never by `species.model.size`),
 *    so a whale and a fox share a consistent, well-proportioned world scale.
 * 2. Assigned to `WORLD_LAYER` (layer 1) and clipped in its materials to the
 *    `#stage` DOM element, while `<Actor>` animals remain on layer 0 and render full-viewport so
 *    they can still leap out of the cards and soar across the UI on enter/exit.
 */
export function HabitatWorld({ reducedMotion }: { reducedMotion: boolean }) {
  const activeId = useAtlas((s) => s.activeId);
  const theme = useAtlas((s) => s.theme);
  const hidden = useAtlas((s) => s.habitatHidden);
  const zooMode = useAtlas((s) => s.zooMode);
  const zooHabitat = useAtlas((s) => s.zooHabitat);
  const zooSelectedIds = useAtlas((s) => s.zooSelectedIds);
  const zooPlaying = useAtlas((s) => s.zooPlaying);
  const species = byId(activeId);
  const habitatId: HabitatId = zooMode ? zooHabitat : (species.model.habitat ?? 'savanna');
  const [displayedId, setDisplayedId] = useState(habitatId);
  const [readyId, setReadyId] = useState<HabitatId | null>(null);
  const worldRef = useRef<Group>(null!);
  const parallaxRef = useRef<Group>(null!);
  const { camera, size } = useThree();

  const reveal = useMemo<HabitatReveal>(() => ({
    progress: { value: reducedMotion ? 1 : 0 },
    window: { value: new Vector4(0, 0, 1, 1) },
  }), []);
  const onReady = useCallback(() => setReadyId(displayedId), [displayedId]);

  useEffect(() => {
    if (reducedMotion) {
      reveal.progress.value = hidden ? 0 : 1;
      setDisplayedId(habitatId);
      emitViewChange();
      return;
    }
    const changing = habitatId !== displayedId;
    const fadingOut = hidden || changing;
    if (!fadingOut && readyId !== displayedId) return;
    const tween = gsap.to(reveal.progress, {
      value: fadingOut ? 0 : 1,
      duration: fadingOut ? 0.2 : 0.62,
      ease: fadingOut ? 'power2.in' : 'power3.out',
      onUpdate: emitViewChange,
      onComplete: () => {
        if (changing) {
          setReadyId(null);
          setDisplayedId(habitatId);
        }
      },
    });
    return () => { tween.kill(); };
  }, [habitatId, displayedId, readyId, reducedMotion, hidden, reveal]);

  // Update world placement & gentle counter-parallax before the custom render pipeline runs.
  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const t = state.clock.elapsedTime;
    const m = getStageMetrics(camera, size.width, size.height, t);

    if (worldRef.current) {
      worldRef.current.position.copy(m.anchor);
      worldRef.current.scale.setScalar(m.unit);
      // Skip the world's draw calls entirely once the reveal wipe reaches 0 (hidden or mid-transition).
      worldRef.current.visible = reveal.progress.value > 0;
    }

    if (parallaxRef.current) {
      // Subtle camera-orbit feel when the user drags or moves the pointer
      const targetY =
        Math.sin(controls.rotY) * -0.10 +
        (reducedMotion || controls.dragging ? 0 : -controls.pointerX * 0.025);
      const targetX =
        Math.max(-0.035, Math.min(0.035, -controls.rotX * 0.055)) +
        (reducedMotion || controls.dragging ? 0 : -controls.pointerY * 0.01);
      const k = reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
      parallaxRef.current.rotation.y += (targetY - parallaxRef.current.rotation.y) * k;
      parallaxRef.current.rotation.x += (targetX - parallaxRef.current.rotation.x) * k;

      // Coupled subtle zoom response so zooming into the animal also brings the terrain slightly closer
      const zScale = habitatZoom(controls.zoom);
      parallaxRef.current.scale.setScalar(zScale);
    }
  });

  // One shared depth/shadow pass; only habitat materials clip themselves to the stage.
  useFrame((state) => {
    const { gl, scene, camera: cam, size: vp } = state;
    const el = stageElement();
    const r = el?.getBoundingClientRect();

    gl.autoClear = false;
    gl.setScissorTest(false);
    gl.clear(true, true, true);

    if (r && r.width > 8 && r.height > 8) {
      // Inset by 1px so the CSS rounded vitrine border cleanly frames the WebGL world
      const pad = 1;
      const sx = Math.max(0, Math.round(r.left + pad));
      const sy = Math.max(0, Math.round(vp.height - (r.bottom - pad)));
      const sw = Math.max(1, Math.min(vp.width - sx, Math.round(r.width - pad * 2)));
      const sh = Math.max(1, Math.min(vp.height - sy, Math.round(r.height - pad * 2)));
      const dpr = gl.getPixelRatio();
      reveal.window.value.set(sx * dpr, sy * dpr, sw * dpr, sh * dpr);
      cam.layers.set(0);
      cam.layers.enable(WORLD_LAYER);
    } else {
      cam.layers.set(0);
    }
    gl.render(scene, cam);
  }, 1);

  return (
    <group ref={worldRef}>
      <group ref={parallaxRef}>
        <Suspense fallback={null}>
          <Biome key={displayedId} id={displayedId} theme={theme} reducedMotion={reducedMotion}
            reveal={reveal} onReady={onReady} />
        </Suspense>
        {zooMode && !hidden && (
          <ZooCrowd
            spec={HABITAT_SPECS[displayedId]}
            speciesIds={zooSelectedIds}
            playing={zooPlaying}
            reducedMotion={reducedMotion}
          />
        )}
      </group>
    </group>
  );
}
