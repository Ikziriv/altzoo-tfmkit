import { Component, Suspense, useEffect, useState, type ReactNode } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { PerformanceMonitor, useGLTF } from '@react-three/drei';
import { SPECIES, byId } from '../data/species';
import { useAtlas, type Rect } from '../store';
import { playTransitionCue } from '../audio';
import { Actor } from './Actor';
import { Atmosphere } from './Atmosphere';
import { HabitatWorld } from './Habitat';
import { resetView, VIEW_CHANGE_EVENT } from './controls';
import { stageElement } from './stage';
import { SpecimenLighting } from './SpecimenLighting';

function PrefetchNextSpecies() {
  const activeId = useAtlas((state) => state.activeId);

  useEffect(() => {
    const candidates = SPECIES.filter((species) => species.model.url);
    const index = candidates.findIndex((species) => species.id === activeId);
    const next = candidates[(index + 1 + candidates.length) % candidates.length];
    const timer = window.setTimeout(() => {
      const url = window.innerWidth < 820 && next.model.mobileUrl ? next.model.mobileUrl : next.model.url!;
      useGLTF.preload(url);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [activeId]);

  return null;
}

interface Entry {
  key: number;
  id: string;
  phase: 'enter' | 'exit';
  origin: Rect | null;
  exitDir: -1 | 1;
}

class ModelBoundary extends Component<
  { children: ReactNode; name: string; onError: (name: string) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError(this.props.name);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const on = () => setReduced(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduced;
}

function RenderInvalidator() {
  const invalidate = useThree((state) => state.invalidate);
  useEffect(() => {
    const onViewChange = () => invalidate();
    window.addEventListener(VIEW_CHANGE_EVENT, onViewChange);
    return () => window.removeEventListener(VIEW_CHANGE_EVENT, onViewChange);
  }, [invalidate]);
  return null;
}

/** Keeps the list of on-screen animals: one entering/resting, one leaving. */
function Cast({ reducedMotion }: { reducedMotion: boolean }) {
  const setModelError = useAtlas((state) => state.setModelError);
  const [entries, setEntries] = useState<Entry[]>(() => [
    { key: 0, id: useAtlas.getState().activeId, phase: 'enter', origin: null, exitDir: 1 },
  ]);

  useEffect(
    () =>
      useAtlas.subscribe((state, prev) => {
        if (state.selectionSeq === prev.selectionSeq) return;
        resetView(0.9);
        playTransitionCue(byId(state.activeId).model.kind, state.soundEnabled);
        // Leave on the side away from the card the newcomer comes from.
        const stage = stageElement()?.getBoundingClientRect();
        const originX = state.originRect ? state.originRect.x + state.originRect.width / 2 : 0;
        const stageX = stage ? stage.left + stage.width / 2 : window.innerWidth / 2;
        const exitDir: -1 | 1 = originX >= stageX ? -1 : 1;
        setEntries((list) => {
          const previous = list[list.length - 1];
          return [
            ...(previous ? [{ ...previous, phase: 'exit' as const, exitDir }] : []),
            { key: state.selectionSeq, id: state.activeId, phase: 'enter', origin: state.originRect, exitDir: 1 },
          ];
        });
      }),
    [],
  );

  return (
    <>
      {entries.map((e) => (
        <ModelBoundary key={e.key} name={byId(e.id).name} onError={setModelError}>
          <Suspense fallback={null}>
            <Actor
              species={byId(e.id)}
              phase={e.phase}
              origin={e.origin}
              exitDir={e.exitDir}
              reducedMotion={reducedMotion}
              onExited={() => setEntries((list) => list.filter((x) => x.key !== e.key))}
            />
          </Suspense>
        </ModelBoundary>
      ))}
    </>
  );
}

/**
 * Full-viewport transparent canvas layered above the page. Pointer events pass
 * through, so animals can roam over the interface without blocking it.
 */
export function Scene() {
  const maxDpr = Math.min(window.devicePixelRatio || 1, 1.75);
  const [dpr, setDpr] = useState(maxDpr);
  const reducedMotion = useReducedMotion();
  const motionPaused = useAtlas((state) => state.motionPaused);
  const theme = useAtlas((state) => state.theme);
  const zooMode = useAtlas((state) => state.zooMode);
  const staticMotion = reducedMotion || motionPaused;

  return (
    <div className="scene-layer" aria-hidden="true">
      <Canvas
        shadows="soft"
        camera={{ fov: 30, position: [0, 0, 14], near: 0.1, far: 100 }}
        dpr={dpr}
        frameloop={staticMotion ? 'demand' : 'always'}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      >
        <RenderInvalidator />
        <PerformanceMonitor
          flipflops={3}
          onDecline={() => setDpr(1)}
          onIncline={() => setDpr(maxDpr)}
          onFallback={() => setDpr(1)}
        />
        <SpecimenLighting theme={theme} />
        <HabitatWorld reducedMotion={staticMotion} />
        <Atmosphere />
        <PrefetchNextSpecies />
        {!zooMode && <Cast reducedMotion={staticMotion} />}
      </Canvas>
    </div>
  );
}

