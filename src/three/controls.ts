import gsap from 'gsap';

export const VIEW_CHANGE_EVENT = 'atlas:view-change';

/**
 * Mutable view-control state shared between DOM handlers and the render loop.
 * Kept outside React so dragging never triggers re-renders.
 */
export const controls = {
  rotY: 0,
  rotX: 0,
  velY: 0,
  zoom: 1,
  dragging: false,
  pointerX: 0,
  pointerY: 0,
};

export const ZOOM_MIN = 0.7;
export const ZOOM_MAX = 3;

export const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z));
const duration = (value: number) =>
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0.01 : value;

export function emitViewChange() {
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

export function interruptView() {
  controls.velY = 0;
  gsap.killTweensOf(controls);
}

export function zoomTo(z: number, speed = 0.7) {
  gsap.to(controls, { zoom: clampZoom(z), duration: duration(speed), ease: 'power3.out', overwrite: 'auto', onUpdate: emitViewChange });
}

export function zoomBy(factor: number) {
  zoomTo(controls.zoom * factor);
}

export function zoomByImmediate(factor: number) {
  interruptView();
  controls.zoom = clampZoom(controls.zoom * factor);
  emitViewChange();
}

export function spin(direction: 1 | -1) {
  controls.velY = 0;
  gsap.to(controls, {
    rotY: controls.rotY + direction * Math.PI * 2,
    duration: duration(1.4),
    ease: 'power2.inOut',
    overwrite: 'auto',
    onUpdate: emitViewChange,
  });
}

export function nudge(dy: number) {
  controls.velY = 0;
  gsap.to(controls, { rotY: controls.rotY + dy, duration: duration(0.5), ease: 'power2.out', overwrite: 'auto', onUpdate: emitViewChange });
}

export function focus(target: { zoom: number; rotY: number; rotX: number }) {
  controls.velY = 0;
  // Take the shortest way round to the preset angle.
  const twoPi = Math.PI * 2;
  const current = controls.rotY;
  let delta = (target.rotY - current) % twoPi;
  if (delta > Math.PI) delta -= twoPi;
  if (delta < -Math.PI) delta += twoPi;
  gsap.to(controls, {
    rotY: current + delta,
    rotX: target.rotX,
    zoom: clampZoom(target.zoom),
    duration: duration(0.95),
    ease: 'power3.inOut',
    overwrite: 'auto',
    onUpdate: emitViewChange,
  });
}

export function resetView(speed = 0.8) {
  interruptView();
  // Unwind accumulated full turns so the reset doesn't spin several times.
  const twoPi = Math.PI * 2;
  controls.rotY = ((((controls.rotY + Math.PI) % twoPi) + twoPi) % twoPi) - Math.PI;
  gsap.to(controls, { rotY: 0, rotX: 0, zoom: 1, duration: duration(speed), ease: 'power3.inOut', overwrite: 'auto', onUpdate: emitViewChange });
}
