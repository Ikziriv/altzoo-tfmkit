import { Suspense, useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { ACESFilmicToneMapping, DirectionalLight, Object3D } from 'three';
import { byId } from '../data/species';
import { useAtlas, type Theme } from '../store';
import { getStageMetrics } from './stage';
import { HABITAT_SPECS, type HabitatId } from './habitat/specs';
import { WORLD_LAYER } from './habitat/Biome';

function enableBothLayers(obj: Object3D | null) {
  if (!obj) return;
  obj.layers.enable(0);
  obj.layers.enable(WORLD_LAYER);
}

function HdriEnvironment({ files, intensity }: { files: string; intensity: number }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.environmentIntensity = intensity;
  }, [scene, intensity]);
  return <Environment files={files} background={false} environmentIntensity={intensity} />;
}

export function SpecimenLighting({ theme, habitatOverride }: { theme: Theme; habitatOverride?: HabitatId }) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const activeHabitat = useAtlas((s) => byId(s.activeId).model.habitat ?? 'savanna');
  const habitatId: HabitatId = habitatOverride ?? activeHabitat;
  const spec = HABITAT_SPECS[habitatId];
  const l = spec.themes[theme];
  const sunRef = useRef<DirectionalLight>(null!);

  useEffect(() => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = theme === 'day' ? 1.06 : 0.94;
    scene.environmentIntensity = l.envIntensity;
  }, [gl, scene, theme, l.envIntensity]);

  // Keep directional shadow frustum tightly centered on the stage anchor so shadow texels stay crisp.
  useFrame((state) => {
    const sun = sunRef.current;
    if (!sun) return;
    const m = getStageMetrics(state.camera, state.size.width, state.size.height, state.clock.elapsedTime);
    sun.position.set(
      m.anchor.x + l.sunPos[0] * m.unit * 0.45,
      m.anchor.y + l.sunPos[1] * m.unit * 0.45,
      l.sunPos[2] * m.unit * 0.45,
    );
    sun.target.position.copy(m.anchor);
    sun.target.updateMatrixWorld();
  });

  return (
    <>
      {spec.hdri && !habitatOverride ? (
        <Suspense fallback={null}>
          <HdriEnvironment files={spec.hdri} intensity={l.envIntensity} />
        </Suspense>
      ) : null}

      <Environment key={`${habitatId}-${theme}`} resolution={256} frames={1} environmentIntensity={l.envIntensity}>
        <color attach="background" args={[l.skyMid]} />
        <Lightformer
          form="rect"
          intensity={theme === 'day' ? 2.8 : 1.8}
          color={l.sunColor}
          position={[3, 4, 5]}
          scale={[6, 6, 1]}
          onUpdate={(self) => self.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={theme === 'day' ? 1.3 : 0.65}
          color={l.hemiSky}
          position={[-4, 1, 3]}
          scale={[5, 5, 1]}
          onUpdate={(self) => self.lookAt(0, 0, 0)}
        />
        <Lightformer
          form="rect"
          intensity={theme === 'day' ? 1.8 : 2.5}
          color={l.rimColor}
          position={[0, 3, -5]}
          scale={[5, 5, 1]}
          onUpdate={(self) => self.lookAt(0, 0, 0)}
        />
      </Environment>

      <hemisphereLight
        args={[l.hemiSky, l.hemiGround, l.hemiIntensity]}
        onUpdate={enableBothLayers}
      />

      <directionalLight
        ref={sunRef}
        position={l.sunPos}
        intensity={l.sunIntensity}
        color={l.sunColor}
        castShadow
        shadow-mapSize-width={1536}
        shadow-mapSize-height={1536}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-near={0.5}
        shadow-camera-far={24}
        shadow-camera-left={-3.2}
        shadow-camera-right={3.2}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-3.2}
        onUpdate={enableBothLayers}
      />

      <directionalLight
        position={[-5, 3.5, -5]}
        intensity={l.rimIntensity}
        color={l.rimColor}
        onUpdate={enableBothLayers}
      />
    </>
  );
}
