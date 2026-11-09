import { fbm2, smoothstep } from './noise';
import type { HabitatSpec } from './specs';

/** Shared by terrain, props and the specimen's foot placement. */
export function sampleTerrainY(spec: HabitatSpec, x: number, z: number): number {
  const r = Math.hypot(x, z * 0.92);
  const clearing = smoothstep(0.55, 1.35, r);
  const n1 = fbm2(x * spec.terrainFreq + 3.1, z * spec.terrainFreq - 1.7, 4);
  const n2 = fbm2(x * spec.terrainFreq * 2.3 - 5.4, z * spec.terrainFreq * 2.3 + 2.8, 3) * 0.35;
  const undulation = (n1 + n2) * spec.terrainAmp * clearing;
  const bowl = Math.pow(smoothstep(0.65, 3.1, r), 1.45) * spec.bowlLift * (1 - smoothstep(0.3, 1.6, z));
  const backRidge =
    smoothstep(-0.35, -2.5, z) *
    (0.55 + 0.45 * fbm2(x * 0.65 + 1.9, z * 0.65, 3)) *
    spec.ridgeLift;
  const basin = spec.hasWater
    ? -smoothstep(1.35, 0.15, Math.hypot(x - 0.25, z - 0.05)) * 0.09
    : 0;
  return spec.groundY + undulation + bowl + backRidge + basin;
}

export function habitatZoom(zoom: number): number {
  return 1 + (Math.min(zoom, 1.8) - 1) * 0.28;
}

/** Lift the centre, not the feet, as a grounded specimen is enlarged. */
export function restingCenterY(minY: number, size: number, groundY: number, zoom: number): number {
  return groundY * habitatZoom(zoom) - minY * size * zoom;
}
