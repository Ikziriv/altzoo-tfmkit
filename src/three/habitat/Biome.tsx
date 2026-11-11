import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  AnimationMixer,
  BackSide,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  LinearSRGBColorSpace,
  LoopRepeat,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
} from 'three';
import { useGLTF } from '@react-three/drei';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { fbm2, fbm3, rng, smoothstep } from './noise';
import { HABITAT_SPECS, type HabitatId, type HabitatSpec } from './specs';
import type { Theme } from '../../store';
import { sampleTerrainY } from './placement';
import { attachHabitatReveal, type HabitatReveal } from './reveal';

export const WORLD_LAYER = 1;

const texLoader = new TextureLoader();
const texCache = new Map<string, Texture>();

function loadCachedTexture(url: string, srgb: boolean, repeat = 1): Texture {
  const key = `${url}|${srgb}|${repeat}`;
  const cached = texCache.get(key);
  if (cached) return cached;
  const tex = texLoader.load(url);
  tex.colorSpace = srgb ? SRGBColorSpace : LinearSRGBColorSpace;
  if (repeat > 1) {
    tex.wrapS = tex.wrapT = RepeatWrapping;
    tex.repeat.set(repeat, repeat);
  }
  tex.anisotropy = 4;
  texCache.set(key, tex);
  return tex;
}

function setWorldLayer(obj: Object3D) {
  obj.layers.set(WORLD_LAYER);
  obj.traverse((c) => c.layers.set(WORLD_LAYER));
}

/** Builds the sculpted terrain BufferGeometry with height- & slope-based vertex colors. */
function buildTerrainGeometry(spec: HabitatSpec): BufferGeometry {
  const geo = new PlaneGeometry(6.8, 9.6, 112, 128);
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, 0, 1.4);
  const pos = geo.attributes.position as BufferAttribute;
  const col = new Float32Array(pos.count * 3);

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = sampleTerrainY(spec, x, z);
    pos.setY(i, y);

    const r = Math.hypot(x, Math.min(z, 0) * 0.92);
    const n = fbm2(x * 1.4 + 7.2, z * 1.4 - 3.4, 3) * 0.5 + 0.5;
    // R = primary/secondary tint blend, G = edge fade, B = ambient occlusion in hollows
    const heightBlend = smoothstep(spec.groundY - 0.05, spec.groundY + 0.42, y) * 0.65 + n * 0.35;
    const edgeFade = 1 - smoothstep(2.35, 3.25, r);
    const ao = 0.72 + 0.28 * smoothstep(spec.groundY - 0.08, spec.groundY + 0.25, y);
    col[i * 3] = heightBlend;
    col[i * 3 + 1] = edgeFade;
    col[i * 3 + 2] = ao;
  }

  geo.setAttribute('color', new BufferAttribute(col, 3));
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/** Builds a displaced, faceted-yet-organic 3D boulder geometry using 3D FBM noise. */
function buildBoulderGeometry(seed: number): BufferGeometry {
  const geo = new SphereGeometry(1, 28, 22);
  const pos = geo.attributes.position as BufferAttribute;
  const v = new Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const n = fbm3(v.x * 1.65 + seed, v.y * 1.65 - seed * 0.7, v.z * 1.65 + seed * 1.3, 4);
    const crag = Math.abs(fbm3(v.x * 3.4 - seed, v.y * 3.4, v.z * 3.4 + seed, 2)) * 0.16;
    const flatBottom = v.y < -0.25 ? 0.55 : 1;
    const d = 1 + n * 0.28 - crag;
    v.multiplyScalar(d);
    v.y *= flatBottom;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  geo.computeBoundingBox();
  return geo;
}

/** Builds a single grass/reed/kelp clump geometry (3 crossed curved ribbons per instance). */
function buildFloraGeometry(kind: HabitatSpec['floraKind']): BufferGeometry {
  const blades = kind === 'forestFern' ? 5 : 3;
  const segY = 5;
  const vertsPerBlade = (segY + 1) * 2;
  const positions = new Float32Array(blades * vertsPerBlade * 3);
  const uvs = new Float32Array(blades * vertsPerBlade * 2);
  const indices: number[] = [];

  const baseW = kind === 'forestFern' ? 0.095 : kind === 'savannaGrass' ? 0.036 : 0.045;

  for (let b = 0; b < blades; b++) {
    const angle = (b / blades) * Math.PI + (b % 2 === 0 ? 0.18 : -0.18);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const lean = kind === 'forestFern' ? 0.28 + (b % 2) * 0.14 : 0.08 + (b - 1) * 0.05;
    const hScale = 0.82 + ((b * 37) % 10) * 0.03;

    for (let iy = 0; iy <= segY; iy++) {
      const v = iy / segY;
      const taper =
        kind === 'forestFern'
          ? Math.sin(v * Math.PI) * 1.15 + (1 - v) * 0.25
          : (1 - v * v * 0.88);
      const w = baseW * taper;
      const y = v * hScale;
      const arch = v * v * lean;

      const vIdx = b * vertsPerBlade + iy * 2;
      positions[vIdx * 3] = -w * cos + arch * sin;
      positions[vIdx * 3 + 1] = y;
      positions[vIdx * 3 + 2] = -w * sin - arch * cos;
      uvs[vIdx * 2] = 0;
      uvs[vIdx * 2 + 1] = v;

      positions[(vIdx + 1) * 3] = w * cos + arch * sin;
      positions[(vIdx + 1) * 3 + 1] = y;
      positions[(vIdx + 1) * 3 + 2] = w * sin - arch * cos;
      uvs[(vIdx + 1) * 2] = 1;
      uvs[(vIdx + 1) * 2 + 1] = v;
    }

    const baseVert = b * vertsPerBlade;
    for (let iy = 0; iy < segY; iy++) {
      const a = baseVert + iy * 2;
      const c = a + 1;
      const d = a + 2;
      const e = a + 3;
      indices.push(a, d, c, c, d, e);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute('position', new BufferAttribute(positions, 3));
  geo.setAttribute('uv', new BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/** Distant mountain / tree / reef silhouette ring around the back horizon. */
function buildHorizonRidgeGeometry(spec: HabitatSpec): BufferGeometry {
  const segX = 96;
  const geo = new CylinderGeometry(3.35, 3.55, 1.35, segX, 1, true, Math.PI * 0.62, Math.PI * 0.76);
  const pos = geo.attributes.position as BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    if (y > 0) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const ang = Math.atan2(x, -z);
      const envelope = Math.cos((ang / (Math.PI * 0.38)) * (Math.PI * 0.5));
      const n =
        fbm2(ang * 3.8 + 1.3, spec.terrainFreq * 2.1, 4) * 0.38 +
        Math.abs(fbm2(ang * 9.5, 2.7, 2)) * 0.18;
      pos.setY(i, spec.groundY + Math.max(0.02, (0.38 + n) * Math.max(0, envelope)));
    } else {
      pos.setY(i, spec.groundY - 0.25);
    }
  }
  geo.computeVertexNormals();
  return geo;
}

/** Equirectangular-band + atmospheric-gradient sky dome behind the terrain. */
function SkyDome({ spec, theme, timeRef }: { spec: HabitatSpec; theme: Theme; timeRef: React.MutableRefObject<number> }) {
  const tSpec = spec.themes[theme];
  const skyTex = useMemo(
    () => (spec.skyMap ? loadCachedTexture(spec.skyMap, true, 1) : null),
    [spec.skyMap],
  );

  const mat = useMemo(() => {
    return new ShaderMaterial({
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new Color(tSpec.skyTop) },
        uMid: { value: new Color(tSpec.skyMid) },
        uHorizon: { value: new Color(tSpec.skyHorizon) },
        uSunDir: { value: new Vector3(...tSpec.sunPos).normalize() },
        uSunColor: { value: new Color(tSpec.sunColor) },
        uMap: { value: skyTex },
        uHasMap: { value: skyTex ? 1 : 0 },
        uMapStrength: { value: skyTex ? tSpec.skyStrength : 0 },
        uYaw: { value: spec.skyYaw },
        uMarine: { value: spec.marine ? 1 : 0 },
        uNight: { value: theme === 'night' ? 1 : 0 },
        uTime: { value: 0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorldDir;
        varying vec3 vLocalPos;
        void main() {
          vLocalPos = position;
          vWorldDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uTop;
        uniform vec3 uMid;
        uniform vec3 uHorizon;
        uniform vec3 uSunDir;
        uniform vec3 uSunColor;
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform float uMapStrength;
        uniform float uYaw;
        uniform float uMarine;
        uniform float uNight;
        uniform float uTime;
        varying vec3 vWorldDir;
        varying vec3 vLocalPos;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        void main() {
          vec3 d = normalize(vWorldDir);
          float h = clamp(d.y * 1.35 + 0.12, 0.0, 1.0);
          vec3 grad = mix(uHorizon, uMid, smoothstep(0.0, 0.42, h));
          grad = mix(grad, uTop, smoothstep(0.38, 0.95, h));

          // Subtle sun/moon Mie scatter glow
          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          grad += uSunColor * (pow(sunDot, 18.0) * 0.28 + pow(sunDot, 160.0) * 0.55);

          // Photographic equirectangular horizon band (-20 deg .. +30 deg)
          if (uHasMap > 0.5 && uMapStrength > 0.01) {
            float lat = asin(clamp(d.y, -1.0, 1.0));
            float lon = atan(d.x, -d.z) + uYaw;
            float u = fract(lon / 6.2831853 + 0.5);
            // Strip covers lat +30deg (top, v=1 in GL) to -20deg (bottom, v=0 in GL)
            float v = clamp((lat - (-0.349)) / (0.5236 - (-0.349)), 0.0, 1.0);
            vec3 photo = texture2D(uMap, vec2(u, v)).rgb;
            if (uNight > 0.5) {
              float luma = dot(photo, vec3(0.299, 0.587, 0.114));
              photo = mix(vec3(luma) * vec3(0.18, 0.28, 0.46), uMid, 0.45);
            }
            float bandMask = smoothstep(-0.26, -0.04, lat) * (1.0 - smoothstep(0.28, 0.49, lat));
            grad = mix(grad, photo, bandMask * uMapStrength);
          }

          // Marine overhead water-surface shimmer & caustic glow
          if (uMarine > 0.5) {
            float upGlow = smoothstep(0.15, 0.92, d.y);
            float wave = sin(d.x * 14.0 + uTime * 1.1) * cos(d.z * 14.0 - uTime * 0.9);
            grad += uSunColor * upGlow * (0.14 + 0.08 * wave);
          }

          // Crisp night starfield in upper sky
          if (uNight > 0.5 && uMarine < 0.5 && d.y > 0.08) {
            vec2 starUv = floor(d.xz / (d.y + 0.35) * 190.0);
            float st = hash(starUv);
            if (st > 0.994) {
              float twinkle = 0.55 + 0.45 * sin(uTime * 2.3 + st * 90.0);
              grad += vec3(0.85, 0.92, 1.0) * twinkle * smoothstep(0.08, 0.35, d.y) * 0.75;
            }
          }

          // Soft lower hemisphere ground-fog blend
          float below = smoothstep(0.04, -0.28, d.y);
          grad = mix(grad, uHorizon * 0.86, below);

          gl_FragColor = vec4(grad, 1.0);
        }
      `,
    });
  }, [skyTex, spec.marine, spec.skyYaw, tSpec, theme]);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame(() => {
    mat.uniforms.uTime.value = timeRef.current;
  });

  const domeGeo = useMemo(() => new SphereGeometry(4.2, 48, 32), []);
  useEffect(() => () => domeGeo.dispose(), [domeGeo]);

  return (
    <mesh
      geometry={domeGeo}
      material={mat}
      position={[0, 0.1, -0.4]}
      scale={[1.15, 0.88, 1.15]}
      onUpdate={setWorldLayer}
    />
  );
}

/** Instanced wind-animated grass, ferns, reeds or kelp planted across the terrain. */
function InstancedFlora({
  spec,
  theme,
  timeRef,
  reducedMotion,
}: {
  spec: HabitatSpec;
  theme: Theme;
  timeRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const tSpec = spec.themes[theme];
  const meshRef = useRef<InstancedMesh>(null!);
  const uTime = useMemo(() => ({ value: 0 }), []);

  const geo = useMemo(() => buildFloraGeometry(spec.floraKind), [spec.floraKind]);

  const { matrices, colors, count } = useMemo(() => {
    const rand = rng(spec.id.charCodeAt(0) * 917 + spec.floraCount);
    const max = spec.floraCount;
    const matArr = new Float32Array(max * 16);
    const colArr = new Float32Array(max * 3);
    const dummy = new Object3D();
    let placed = 0;

    for (let i = 0; i < max * 2 && placed < max; i++) {
      // Distribute in an organic ring around the animal clearing, denser in midground/background
      const u = rand();
      const angle = (rand() - 0.5) * Math.PI * 1.75;
      const radius = 0.42 + Math.pow(u, 0.78) * 2.35;
      const x = Math.sin(angle) * radius * 1.15;
      const z = -Math.cos(angle) * radius * 0.88 - 0.22;

      // Leave a natural path/clearing directly beneath the resting animal feet
      const inClearing = Math.hypot(x * 0.82, (z + 0.08) * 1.12);
      if (inClearing < 0.72) continue;

      // Clump modulation via low-frequency FBM so meadows have natural patches
      const patch = fbm2(x * 1.6 + 4.1, z * 1.6 - 2.3, 2);
      if (patch < -0.22 && rand() < 0.75) continue;

      const y = sampleTerrainY(spec, x, z);
      // In wetland, keep reeds mostly along the muddy banks above deepest water
      if (spec.hasWater && y < spec.waterY - 0.035) continue;

      const s = spec.floraHeight * (0.68 + rand() * 0.72 + Math.max(0, patch) * 0.35);
      dummy.position.set(x, y - 0.012, z);
      dummy.rotation.set((rand() - 0.5) * 0.16, rand() * Math.PI * 2, (rand() - 0.5) * 0.16);
      dummy.scale.set(s, s * (0.85 + rand() * 0.45), s);
      dummy.updateMatrix();
      dummy.matrix.toArray(matArr, placed * 16);

      colArr[placed * 3] = 0.75 + rand() * 0.5;
      colArr[placed * 3 + 1] = rand();
      colArr[placed * 3 + 2] = 0.8 + rand() * 0.4;
      placed++;
    }

    return { matrices: matArr, colors: colArr, count: placed };
  }, [spec]);

  useEffect(() => {
    const inst = meshRef.current;
    if (!inst) return;
    inst.layers.set(WORLD_LAYER);
    for (let i = 0; i < count; i++) {
      inst.instanceMatrix.array.set(matrices.subarray(i * 16, i * 16 + 16), i * 16);
    }
    inst.instanceMatrix.needsUpdate = true;
    geo.setAttribute('aTone', new InstancedBufferAttribute(colors, 3));
  });

  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({
      roughness: spec.marine ? 0.55 : 0.78,
      metalness: 0.02,
      side: DoubleSide,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime;
      shader.uniforms.uBaseCol = { value: new Color(tSpec.grassBase) };
      shader.uniforms.uTipCol = { value: new Color(tSpec.grassTip) };
      shader.uniforms.uMarine = { value: spec.marine ? 1 : 0 };
      shader.vertexShader =
        `attribute vec3 aTone;\nvarying float vBladeH;\nvarying vec3 vTone;\nuniform float uTime;\nuniform float uMarine;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `
            #include <begin_vertex>
            vBladeH = uv.y;
            vTone = aTone;
            vec3 instPos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
            float bend = uv.y * uv.y;
            float freq = uMarine > 0.5 ? 1.55 : 2.35;
            float amp = uMarine > 0.5 ? 0.22 : 0.12;
            float wave = sin(uTime * freq + instPos.x * 2.7 + instPos.z * 2.1 + aTone.y * 6.28)
                       + 0.45 * cos(uTime * (freq * 0.7) - instPos.z * 3.2);
            transformed.x += wave * amp * bend;
            transformed.z += wave * amp * 0.55 * bend;
          `,
        );
      shader.fragmentShader =
        `varying float vBladeH;\nvarying vec3 vTone;\nuniform vec3 uBaseCol;\nuniform vec3 uTipCol;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          /* glsl */ `
            #include <color_fragment>
            vec3 gCol = mix(uBaseCol, uTipCol, smoothstep(0.08, 0.95, vBladeH));
            gCol *= mix(0.84, 1.14, vTone.x * 0.5);
            diffuseColor.rgb *= gCol;
          `,
        );
    };
    m.customProgramCacheKey = () => `flora-${spec.id}-${theme}`;
    return m;
  }, [spec.id, spec.marine, tSpec.grassBase, tSpec.grassTip, theme, uTime]);

  useEffect(() => {
    return () => {
      geo.dispose();
      mat.dispose();
    };
  }, [geo, mat]);

  useFrame(() => {
    if (!reducedMotion) uTime.value = timeRef.current;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, count]}
      castShadow={!spec.marine}
      receiveShadow
      frustumCulled={false}
      onUpdate={setWorldLayer}
    />
  );
}

/** Reflective animated water plane for the wetland lagoon habitat. */
function WaterSurface({
  spec,
  theme,
  timeRef,
  reducedMotion,
}: {
  spec: HabitatSpec;
  theme: Theme;
  timeRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const tSpec = spec.themes[theme];
  const norTex = useMemo(() => loadCachedTexture('/habitat/tex/coast_sand_01_nor.jpg', false, 6), []);
  const uTime = useMemo(() => ({ value: 0 }), []);

  const mat = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uDeep: { value: new Color(tSpec.waterDeep ?? '#0f3038') },
        uShallow: { value: new Color(tSpec.waterColor ?? '#286470') },
        uSky: { value: new Color(tSpec.skyMid) },
        uSun: { value: new Color(tSpec.sunColor) },
        uNor: { value: norTex },
        uTime: uTime,
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        uniform float uTime;
        void main() {
          vUv = uv;
          vec3 p = position;
          float ripple = sin(p.x * 5.2 + uTime * 1.7) * cos(p.y * 6.4 - uTime * 1.3) * 0.006;
          p.z += ripple;
          vWorldPos = (modelMatrix * vec4(p, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform vec3 uSky;
        uniform vec3 uSun;
        uniform sampler2D uNor;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vec2 uv1 = vUv * 5.5 + vec2(uTime * 0.022, -uTime * 0.016);
          vec2 uv2 = vUv * 8.0 + vec2(-uTime * 0.018, uTime * 0.024);
          vec3 n1 = texture2D(uNor, uv1).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(uNor, uv2).xyz * 2.0 - 1.0;
          vec2 n = (n1.xy + n2.xy) * 0.5;

          float depthGrad = smoothstep(0.0, 0.85, vUv.y);
          vec3 waterCol = mix(uShallow, uDeep, depthGrad);

          // Grazing-angle sky reflection + sun glint on wave crests
          float fresnel = clamp(0.18 + 0.42 * (1.0 - vUv.y) + n.x * 0.16, 0.0, 0.72);
          vec3 col = mix(waterCol, uSky * 0.78, fresnel * 0.48);

          float glint = pow(max(0.0, n.x * 0.7 + n.y * 0.7), 5.0);
          col += uSun * glint * 0.55;

          // Subtle shoreline foam & edge fade
          float edge = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x) * smoothstep(0.0, 0.1, vUv.y);
          gl_FragColor = vec4(col, 0.82 * edge);
        }
      `,
    });
  }, [norTex, tSpec.skyMid, tSpec.sunColor, tSpec.waterColor, tSpec.waterDeep, uTime]);

  const geo = useMemo(() => new PlaneGeometry(5.8, 4.4, 48, 40), []);
  useEffect(() => () => {
    geo.dispose();
    mat.dispose();
  }, [geo, mat]);

  useFrame(() => {
    if (!reducedMotion) {
      uTime.value = timeRef.current;
      norTex.offset.set(timeRef.current * 0.018, timeRef.current * 0.012);
    }
  });

  return (
    <mesh
      geometry={geo}
      material={mat}
      position={[0, spec.waterY, -0.35]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
      onUpdate={setWorldLayer}
    />
  );
}

/** Volumetric sun/water light shafts (reef caustics beams, forest sunbeams, abyssal shafts). */
function LightShafts({
  spec,
  theme,
  timeRef,
  reducedMotion,
}: {
  spec: HabitatSpec;
  theme: Theme;
  timeRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const tSpec = spec.themes[theme];
  const show = spec.marine || spec.id === 'forest';
  const uTime = useMemo(() => ({ value: 0 }), []);

  const mat = useMemo(() => {
    return new ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uColor: { value: new Color(tSpec.sunColor) },
        uTime: uTime,
        uOpacity: {
          value:
            spec.id === 'reef'
              ? theme === 'day'
                ? 0.16
                : 0.11
              : spec.id === 'abyss'
                ? 0.09
                : theme === 'day'
                  ? 0.11
                  : 0.05,
        },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uTime;
        uniform float uOpacity;
        varying vec2 vUv;
        void main() {
          float fadeY = smoothstep(0.0, 0.35, vUv.y) * (1.0 - smoothstep(0.65, 1.0, vUv.y));
          float edgeX = sin(vUv.x * 3.14159);
          float streak = 0.65 + 0.35 * sin(vUv.x * 18.0 + uTime * 0.8);
          float a = fadeY * edgeX * edgeX * streak * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
  }, [spec.id, tSpec.sunColor, theme, uTime]);

  const coneGeo = useMemo(() => new CylinderGeometry(0.18, 0.72, 2.8, 18, 1, true), []);
  useEffect(() => () => {
    coneGeo.dispose();
    mat.dispose();
  }, [coneGeo, mat]);

  useFrame(() => {
    if (!reducedMotion) uTime.value = timeRef.current;
  });

  if (!show) return null;

  const shafts = [
    { x: -0.65, y: 0.55, z: -0.85, rz: -0.22, s: 1.05 },
    { x: 0.35, y: 0.62, z: -1.15, rz: -0.18, s: 1.25 },
    { x: 1.05, y: 0.48, z: -0.75, rz: -0.24, s: 0.88 },
  ];

  return (
    <group onUpdate={setWorldLayer}>
      {shafts.map((sh, i) => (
        <mesh
          key={i}
          geometry={coneGeo}
          material={mat}
          position={[sh.x, sh.y, sh.z]}
          rotation={[0.08, 0, sh.rz]}
          scale={sh.s}
          onUpdate={setWorldLayer}
        />
      ))}
    </group>
  );
}

/** Background habitat GLB props (acacias, coral heads, kelp fronds, pond reeds) grounded on the terrain. */
function HabitatProps({ spec }: { spec: HabitatSpec }) {
  const { scene } = useGLTF(spec.propUrl);

  const normalized = useMemo(() => {
    const inst = scene.clone(true) as Group;
    inst.traverse((o) => {
      const m = o as Mesh;
      if (m.isMesh) {
        m.frustumCulled = false;
        m.castShadow = true;
        m.receiveShadow = true;
        m.layers.set(WORLD_LAYER);
        m.material = Array.isArray(m.material) ? m.material.map((mat) => mat.clone()) : m.material.clone();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as MeshStandardMaterial;
          if (std.isMeshStandardMaterial) {
            std.roughness = Math.max(0.55, std.roughness || 0.75);
            std.envMapIntensity = 0.85;
          }
        }
      }
    });
    const box = new Box3().setFromObject(inst);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    // Anchor at the bottom center of the prop so it sits directly on the terrain surface
    inst.position.set(-center.x, -box.min.y, -center.z);
    const norm = new Group();
    norm.scale.setScalar(1 / maxDim);
    norm.add(inst);
    setWorldLayer(norm);
    return norm;
  }, [scene]);

  const clones = useMemo(() => {
    const reefPalette = ['#ff9b7a', '#e89cf5', '#ffd180', '#ff7b8f', '#7ce8d8'];
    return spec.props.map((_, idx) => {
      const c = normalized.clone(true);
      if (spec.id === 'reef') {
        const tint = new Color(reefPalette[idx % reefPalette.length]);
        c.traverse((o) => {
          const m = o as Mesh;
          if (!m.isMesh) return;
          m.material = Array.isArray(m.material) ? m.material.map((mat) => mat.clone()) : m.material.clone();
          const mats = Array.isArray(m.material) ? m.material : [m.material];
          for (const mat of mats) {
            const std = mat as MeshStandardMaterial;
            if (std.isMeshStandardMaterial) {
              std.color.lerp(tint, 0.34);
            }
          }
        });
      }
      setWorldLayer(c);
      return c;
    });
  }, [normalized, spec.id, spec.props]);

  useEffect(() => () => {
    clones.forEach((c) => {
      c.traverse((o) => {
        const mesh = o as Mesh;
        if (!mesh.isMesh) return;
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => mat.dispose());
      });
    });
  }, [clones]);

  if (spec.props.length === 0) return null;

  return (
    <group onUpdate={setWorldLayer}>
      {spec.props.map((p, i) => {
        const y = sampleTerrainY(spec, p.x, p.z) - (p.yOff ?? 0.03);
        return (
          <group
            key={i}
            position={[p.x, y, p.z]}
            rotation={[0, p.ry, 0]}
            scale={p.s}
            onUpdate={setWorldLayer}
          >
            <primitive object={clones[i]} />
          </group>
        );
      })}
    </group>
  );
}

/**
 * Living Sea Zoo background ecosystem for marine biomes (`reef` & `abyss`):
 * - Sea anemone clusters (`env-anemone.glb`) swaying on the reef floor
 * - Skeletal-animated background fish schools (`clownfish.glb`, `bluetang.glb`, `anglerfish.glb`)
 *   swimming along curved 3D reef paths around the coral heads and anemones.
 */
function MarineLife({
  spec,
  timeRef,
  reducedMotion,
}: {
  spec: HabitatSpec;
  timeRef: React.MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const anemoneGltf = useGLTF('/models/env-anemone.glb');
  const clownGltf = useGLTF('/models/clownfish.glb');
  const tangGltf = useGLTF('/models/bluetang.glb');
  const anglerGltf = useGLTF('/models/anglerfish.glb');

  const anemoneSpots = useMemo(
    () =>
      spec.id === 'reef'
        ? [
          { x: -0.74, z: -0.78, s: 0.24, ry: 0.4, tint: '#f43f5e', tip: '#2dd4bf' },
          { x: 0.76, z: -0.84, s: 0.22, ry: -1.1, tint: '#d946ef', tip: '#fde047' },
          { x: -0.32, z: -1.24, s: 0.28, ry: 1.8, tint: '#fb7185', tip: '#5eead4' },
          { x: 0.44, z: -1.32, s: 0.25, ry: -0.5, tint: '#a855f7', tip: '#f472b6' },
        ]
        : [
          { x: -0.68, z: -0.82, s: 0.22, ry: 0.6, tint: '#0284c7', tip: '#38bdf8' },
          { x: 0.72, z: -0.88, s: 0.21, ry: -1.3, tint: '#4f46e5', tip: '#67e8f9' },
          { x: -0.22, z: -1.35, s: 0.25, ry: 2.1, tint: '#0ea5e9', tip: '#22d3ee' },
        ],
    [spec.id],
  );

  const anemones = useMemo(() => {
    const base = anemoneGltf.scene.clone(true) as Group;
    const box = new Box3().setFromObject(base);
    const size = box.getSize(new Vector3());
    const center = box.getCenter(new Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    base.position.set(-center.x, -box.min.y, -center.z);
    const norm = new Group();
    norm.scale.setScalar(1 / maxDim);
    norm.add(base);

    return anemoneSpots.map((spot) => {
      const clone = norm.clone(true);
      const bodyCol = new Color(spot.tint);
      const tipCol = new Color(spot.tip);
      clone.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false;
        m.castShadow = true;
        m.receiveShadow = true;
        m.layers.set(WORLD_LAYER);
        m.material = Array.isArray(m.material) ? m.material.map((mat) => mat.clone()) : m.material.clone();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as MeshStandardMaterial;
          if (!std.isMeshStandardMaterial) continue;
          const isTip = std.name === 'lambert2SG';
          std.color.copy(isTip ? tipCol : bodyCol);
          std.roughness = 0.45;
          std.metalness = 0.04;
          if (spec.id === 'abyss' && isTip) {
            std.emissive.copy(tipCol);
            std.emissiveIntensity = 0.65;
          }
        }
      });
      setWorldLayer(clone);
      return clone;
    });
  }, [anemoneGltf.scene, anemoneSpots, spec.id]);

  const schoolSpecs = useMemo(
    () =>
      spec.id === 'reef'
        ? [
          // Pair of clownfish darting around left host anemone & coral
          { kind: 'clown' as const, cx: -0.68, cy: -0.14, cz: -0.88, rx: 0.28, ry: 0.06, rz: 0.18, speed: 0.72, phase: 0.2, scale: 0.145 },
          { kind: 'clown' as const, cx: -0.58, cy: -0.06, cz: -0.96, rx: 0.24, ry: 0.05, rz: 0.16, speed: 0.82, phase: 2.1, scale: 0.125 },
          // Pair of clownfish around right host anemone & coral
          { kind: 'clown' as const, cx: 0.68, cy: -0.12, cz: -0.92, rx: 0.26, ry: 0.06, rz: 0.18, speed: 0.76, phase: 1.4, scale: 0.14 },
          { kind: 'clown' as const, cx: 0.52, cy: -0.02, cz: -1.12, rx: 0.32, ry: 0.07, rz: 0.22, speed: 0.68, phase: 4.0, scale: 0.13 },
          // Schooling Regal Blue Tangs cruising mid-water reef channel
          { kind: 'tang' as const, cx: -0.18, cy: 0.18, cz: -1.22, rx: 0.68, ry: 0.08, rz: 0.24, speed: 0.56, phase: 0.8, scale: 0.165 },
          { kind: 'tang' as const, cx: 0.22, cy: 0.26, cz: -1.38, rx: 0.74, ry: 0.09, rz: 0.26, speed: 0.52, phase: 3.5, scale: 0.155 },
        ]
        : [
          // Deep-sea anglerfish & bioluminescent bathyal cruisers
          { kind: 'angler' as const, cx: -0.58, cy: 0.06, cz: -1.18, rx: 0.42, ry: 0.07, rz: 0.2, speed: 0.42, phase: 0.5, scale: 0.16 },
          { kind: 'angler' as const, cx: 0.62, cy: 0.16, cz: -1.35, rx: 0.46, ry: 0.08, rz: 0.22, speed: 0.38, phase: 2.9, scale: 0.15 },
          { kind: 'tang' as const, cx: 0.05, cy: 0.24, cz: -1.48, rx: 0.62, ry: 0.07, rz: 0.22, speed: 0.48, phase: 1.7, scale: 0.14 },
        ],
    [spec.id],
  );

  const swimmers = useMemo(() => {
    return schoolSpecs.map((s) => {
      const src = s.kind === 'clown' ? clownGltf : s.kind === 'tang' ? tangGltf : anglerGltf;
      const cloned = cloneSkinned(src.scene) as Group;
      cloned.traverse((o) => {
        const m = o as Mesh;
        if (!m.isMesh) return;
        m.frustumCulled = false;
        m.castShadow = true;
        m.receiveShadow = true;
        m.layers.set(WORLD_LAYER);
        m.material = Array.isArray(m.material) ? m.material.map((mat) => mat.clone()) : m.material.clone();
        const mats = Array.isArray(m.material) ? m.material : [m.material];
        for (const mat of mats) {
          const std = mat as MeshStandardMaterial;
          if (!std.isMeshStandardMaterial) continue;
          std.roughness = 0.36;
          std.metalness = 0.02;
          if (std.name === 'Light') {
            std.emissive = new Color('#5ef2ff');
            std.emissiveIntensity = 2.5;
          } else if (spec.id === 'abyss' && s.kind === 'tang') {
            std.color.lerp(new Color('#38bdf8'), 0.45);
            std.emissive = new Color('#0ea5e9');
            std.emissiveIntensity = 0.35;
          }
        }
      });

      const mixer = new AnimationMixer(cloned);
      const clip =
        src.animations.find((a) => a.name.includes('Swimming_Normal')) ||
        src.animations[0] ||
        null;
      if (clip) {
        const action = mixer.clipAction(clip);
        action.setLoop(LoopRepeat, Infinity);
        action.timeScale = 0.95 + (s.phase % 0.35);
        action.play();
        mixer.update(s.phase * 0.3);
      }
      cloned.updateMatrixWorld(true);

      const box = new Box3().setFromObject(cloned);
      const size = box.getSize(new Vector3());
      const center = box.getCenter(new Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      cloned.position.sub(center);

      const norm = new Group();
      norm.scale.setScalar(s.scale / maxDim);
      norm.add(cloned);

      const holder = new Group();
      // Compute initial pose at t = 0 so initial render is already positioned in reef space
      const theta0 = s.phase;
      const x0 = s.cx + Math.sin(theta0) * s.rx;
      const y0 = s.cy + Math.sin(theta0 * 2 + s.phase) * s.ry;
      const z0 = s.cz + Math.cos(theta0) * s.rz;
      const vx0 = Math.cos(theta0) * s.rx;
      const vz0 = -Math.sin(theta0) * s.rz;
      holder.position.set(x0, y0, z0);
      holder.rotation.y = Math.atan2(vx0, vz0);
      holder.add(norm);
      setWorldLayer(holder);

      return { holder, mixer, spec: s };
    });
  }, [anglerGltf, clownGltf, schoolSpecs, spec.id, tangGltf]);

  const anemoneRefs = useRef<(Group | null)[]>([]);

  useEffect(() => {
    return () => {
      swimmers.forEach((sw) => sw.mixer.stopAllAction());
    };
  }, [swimmers]);

  useFrame((_, rawDt) => {
    if (reducedMotion) return;
    const dt = Math.min(rawDt, 1 / 20);
    const t = timeRef.current;

    for (let i = 0; i < anemoneSpots.length; i++) {
      const g = anemoneRefs.current[i];
      if (!g) continue;
      const sp = anemoneSpots[i];
      g.rotation.z = Math.sin(t * 1.4 + i * 1.3) * 0.06;
      g.rotation.x = Math.cos(t * 1.1 + i * 0.9) * 0.05;
      g.rotation.y = sp.ry + Math.sin(t * 0.7 + i) * 0.04;
    }

    for (const sw of swimmers) {
      sw.mixer.update(dt);
      const s = sw.spec;
      const theta = t * s.speed + s.phase;
      const x = s.cx + Math.sin(theta) * s.rx;
      const y = s.cy + Math.sin(theta * 2 + s.phase) * s.ry;
      const z = s.cz + Math.cos(theta) * s.rz;

      const vx = Math.cos(theta) * s.rx * s.speed;
      const vy = Math.cos(theta * 2 + s.phase) * 2 * s.ry * s.speed;
      const vz = -Math.sin(theta) * s.rz * s.speed;

      sw.holder.position.set(x, y, z);
      sw.holder.rotation.y = Math.atan2(vx, vz);
      sw.holder.rotation.x = -vy * 0.45;
      sw.holder.rotation.z = Math.sin(theta) * 0.08;
    }
  });

  return (
    <group name="marine-life" onUpdate={setWorldLayer}>
      {anemoneSpots.map((sp, i) => {
        const y = sampleTerrainY(spec, sp.x, sp.z) - 0.025;
        return (
          <group
            key={`anemone-${i}`}
            ref={(el) => {
              anemoneRefs.current[i] = el;
            }}
            position={[sp.x, y, sp.z]}
            rotation={[0, sp.ry, 0]}
            scale={sp.s}
            onUpdate={setWorldLayer}
          >
            <primitive object={anemones[i]} />
          </group>
        );
      })}
      {swimmers.map((sw, i) => (
        <primitive key={`swimmer-${i}`} object={sw.holder} />
      ))}
    </group>
  );
}

/** Complete 3D biome environment for a single habitat. */
export function Biome({
  id,
  theme,
  reducedMotion,
  reveal,
  onReady,
}: {
  id: HabitatId;
  theme: Theme;
  reducedMotion: boolean;
  reveal: HabitatReveal;
  onReady: () => void;
}) {
  const root = useRef<Group>(null!);
  const spec = HABITAT_SPECS[id];
  const tSpec = spec.themes[theme];
  const timeRef = useRef(0);
  const uTime = useMemo(() => ({ value: 0 }), []);

  // Load real PBR ground maps + rock maps (cached across switches)
  const { diffMap, norMap, armMap, rockDiff, rockNor, rockArm } = useMemo(() => {
    const r = spec.tex.repeat;
    return {
      diffMap: loadCachedTexture(spec.tex.diff, true, r),
      norMap: loadCachedTexture(spec.tex.nor, false, r),
      armMap: loadCachedTexture(spec.tex.arm, false, r),
      rockDiff: loadCachedTexture('/habitat/tex/rock_boulder_dry_diff.jpg', true, 2),
      rockNor: loadCachedTexture('/habitat/tex/rock_boulder_dry_nor.jpg', false, 2),
      rockArm: loadCachedTexture('/habitat/tex/rock_boulder_dry_arm.jpg', false, 2),
    };
  }, [spec.tex]);

  const terrainGeo = useMemo(() => buildTerrainGeometry(spec), [spec]);
  const ridgeGeo = useMemo(() => buildHorizonRidgeGeometry(spec), [spec]);
  const boulderGeos = useMemo(
    () => spec.boulders.map((_, i) => buildBoulderGeometry(i * 3.7 + id.charCodeAt(0))),
    [id, spec.boulders],
  );

  const terrainMat = useMemo(() => {
    const m = new MeshStandardMaterial({
      map: diffMap,
      normalMap: norMap,
      normalScale: new Vector2(spec.tex.normalScale, spec.tex.normalScale),
      aoMap: armMap,
      roughnessMap: armMap,
      metalnessMap: armMap,
      roughness: spec.tex.roughness,
      metalness: 0.04,
      vertexColors: true,
    });
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTint1 = { value: new Color(tSpec.groundTint) };
      shader.uniforms.uTint2 = { value: new Color(tSpec.groundTint2) };
      shader.uniforms.uFogCol = { value: new Color(tSpec.fogColor) };
      shader.uniforms.uSunCol = { value: new Color(tSpec.sunColor) };
      shader.uniforms.uMarine = { value: spec.marine ? 1 : 0 };
      shader.uniforms.uTime = uTime;
      shader.vertexShader =
        `varying vec3 vWorldPos;\n` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>\nvWorldPos = position;`,
        );
      shader.fragmentShader =
        `varying vec3 vWorldPos;\nuniform vec3 uTint1;\nuniform vec3 uTint2;\nuniform vec3 uFogCol;\nuniform vec3 uSunCol;\nuniform float uMarine;\nuniform float uTime;\n` +
        shader.fragmentShader.replace(
          '#include <color_fragment>',
          /* glsl */ `
            vec3 vMask = vColor;
            vec3 biomeTint = mix(uTint1, uTint2, clamp(vMask.r, 0.0, 1.0));
            diffuseColor.rgb = diffuseColor.rgb * biomeTint * (0.75 + 0.35 * vMask.b);

            // Animated underwater caustic network on reef & abyssal sand
            if (uMarine > 0.5) {
              vec2 p = vWorldPos.xz * 3.4;
              float c1 = sin(p.x * 2.3 + uTime * 1.6 + sin(p.y * 1.9 - uTime * 1.2));
              float c2 = cos(p.y * 2.5 - uTime * 1.4 + cos(p.x * 2.1 + uTime * 1.1));
              float caustic = pow(clamp((c1 * c2) * 0.5 + 0.5, 0.0, 1.0), 3.2);
              diffuseColor.rgb += uSunCol * caustic * 0.32 * vMask.g;
            }
          `,
        ).replace(
          '#include <dithering_fragment>',
          /* glsl */ `
            #include <dithering_fragment>
            // Distance-based atmospheric blend into the horizon fog color
            float distFade = 1.0 - clamp(vMask.g, 0.0, 1.0);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, uFogCol, distFade * 0.92);
          `,
        );
    };
    m.customProgramCacheKey = () => `terrain-${spec.id}-${theme}`;
    return m;
  }, [armMap, diffMap, norMap, spec.id, spec.marine, spec.tex.normalScale, spec.tex.roughness, tSpec, theme, uTime]);

  const boulderMat = useMemo(
    () =>
      new MeshStandardMaterial({
        map: rockDiff,
        normalMap: rockNor,
        normalScale: new Vector2(1.3, 1.3),
        aoMap: rockArm,
        roughnessMap: rockArm,
        roughness: 0.88,
        metalness: 0.05,
        color: new Color(tSpec.rockTint),
      }),
    [rockArm, rockDiff, rockNor, tSpec.rockTint],
  );

  const ridgeMat = useMemo(
    () =>
      new MeshBasicMaterial({
        color: new Color(tSpec.groundTint2).lerp(new Color(tSpec.fogColor), 0.72),
        side: DoubleSide,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      }),
    [tSpec.fogColor, tSpec.groundTint2],
  );

  useLayoutEffect(() => {
    const detach = attachHabitatReveal(root.current, reveal);
    onReady();
    return detach;
  }, [reveal, onReady, theme]);

  useEffect(() => {
    return () => {
      terrainGeo.dispose();
      ridgeGeo.dispose();
      boulderGeos.forEach((g) => g.dispose());
      terrainMat.dispose();
      boulderMat.dispose();
      ridgeMat.dispose();
    };
  }, [boulderGeos, boulderMat, ridgeGeo, ridgeMat, terrainGeo, terrainMat]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    if (!reducedMotion) {
      timeRef.current += dt;
      uTime.value = timeRef.current;
    }
  });

  return (
    <group ref={root} name={`habitat-${id}`} onUpdate={setWorldLayer} dispose={null}>
      <SkyDome spec={spec} theme={theme} timeRef={timeRef} />

      <mesh
        geometry={ridgeGeo}
        material={ridgeMat}
        position={[0, 0, -0.25]}
        onUpdate={setWorldLayer}
      />

      <mesh
        geometry={terrainGeo}
        material={terrainMat}
        receiveShadow
        onUpdate={setWorldLayer}
      />

      {spec.hasWater && (
        <WaterSurface
          spec={spec}
          theme={theme}
          timeRef={timeRef}
          reducedMotion={reducedMotion}
        />
      )}

      <InstancedFlora
        spec={spec}
        theme={theme}
        timeRef={timeRef}
        reducedMotion={reducedMotion}
      />

      <HabitatProps spec={spec} />

      {spec.marine && (
        <MarineLife
          spec={spec}
          timeRef={timeRef}
          reducedMotion={reducedMotion}
        />
      )}

      {spec.boulders.map((b, i) => {
        const bottom = boulderGeos[i].boundingBox?.min.y ?? -0.55;
        const y = sampleTerrainY(spec, b.x, b.z) - bottom * b.s[1] - 0.035;
        return (
          <mesh
            key={i}
            geometry={boulderGeos[i]}
            material={boulderMat}
            position={[b.x, y, b.z]}
            rotation={[b.rx ?? 0.1, b.ry, 0.05]}
            scale={b.s}
            castShadow
            receiveShadow
            onUpdate={setWorldLayer}
          />
        );
      })}

      <LightShafts
        spec={spec}
        theme={theme}
        timeRef={timeRef}
        reducedMotion={reducedMotion}
      />
    </group>
  );
}

useGLTF.preload('/models/env-anemone.glb');
useGLTF.preload('/models/clownfish.glb');
useGLTF.preload('/models/bluetang.glb');
useGLTF.preload('/models/anglerfish.glb');
