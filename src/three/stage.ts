import { Camera, Vector3 } from 'three';

export interface StageMetrics {
  /** World point where the active animal rests. */
  anchor: Vector3;
  /** World length that a model's largest dimension should occupy at zoom 1. */
  unit: number;
  /** World x just beyond the left / right viewport edges at anchor height. */
  leftEdge: number;
  rightEdge: number;
  /** World y just above the viewport top. */
  topEdge: number;
}

const tmp = new Vector3();
const dir = new Vector3();

/** Projects a screen pixel onto the z = 0 world plane. */
export function screenToWorld(
  x: number,
  y: number,
  camera: Camera,
  width: number,
  height: number,
  out = new Vector3(),
) {
  tmp.set((x / width) * 2 - 1, -(y / height) * 2 + 1, 0.5).unproject(camera);
  dir.copy(tmp).sub(camera.position).normalize();
  const t = -camera.position.z / dir.z;
  return out.copy(camera.position).addScaledVector(dir, t);
}

let cacheTime = -1;
const metrics: StageMetrics = {
  anchor: new Vector3(),
  unit: 1,
  leftEdge: -10,
  rightEdge: 10,
  topEdge: 6,
};
const a = new Vector3();
const b = new Vector3();

export function stageElement() {
  return document.getElementById('stage');
}

/** Computes (once per frame) where the stage sits in world space. */
export function getStageMetrics(camera: Camera, width: number, height: number, time: number) {
  if (time === cacheTime) return metrics;
  cacheTime = time;
  const el = stageElement();
  const r = el?.getBoundingClientRect() ?? { left: 0, top: 0, width, height };

  const cx = r.left + r.width / 2;
  const cy = r.top + r.height * 0.5;
  screenToWorld(cx, cy, camera, width, height, metrics.anchor);

  screenToWorld(r.left, r.top, camera, width, height, a);
  screenToWorld(r.left + r.width, r.top + r.height, camera, width, height, b);
  const worldW = Math.abs(b.x - a.x);
  const worldH = Math.abs(a.y - b.y);
  metrics.unit = Math.min(worldH * 0.78, worldW * (r.width < 600 ? 0.82 : 0.62));

  metrics.leftEdge = screenToWorld(-width * 0.12, cy, camera, width, height, a).x;
  metrics.rightEdge = screenToWorld(width * 1.12, cy, camera, width, height, a).x;
  metrics.topEdge = screenToWorld(cx, -height * 0.15, camera, width, height, a).y;
  return metrics;
}

