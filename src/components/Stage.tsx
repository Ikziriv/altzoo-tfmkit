import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { byId } from '../data/species';
import { useSpecies } from '../data/localize';
import { thumbnailUrl } from '../data/thumbnails';
import { useAtlas } from '../store';
import {
  controls,
  emitViewChange,
  interruptView,
  nudge,
  resetView,
  spin,
  zoomBy,
  zoomByImmediate,
} from '../three/controls';
import { Icon } from './Icon';

interface PointerPosition {
  x: number;
  y: number;
}

const distance = (a: PointerPosition, b: PointerPosition) => Math.hypot(a.x - b.x, a.y - b.y);

/** The interactive viewing area. The 3D canvas renders above it; this element captures input. */
export function Stage() {
  const { t } = useTranslation();
  const ref = useRef<HTMLElement>(null);
  const theme = useAtlas((s) => s.theme);
  const setTheme = useAtlas((s) => s.setTheme);
  const active = useSpecies(useAtlas((s) => s.activeId));
  const modelReady = useAtlas((s) => s.modelReady);
  const modelError = useAtlas((s) => s.modelError);
  const detail = useAtlas((s) => s.detail);
  const setDetail = useAtlas((s) => s.setDetail);
  const motionPaused = useAtlas((s) => s.motionPaused);
  const toggleMotion = useAtlas((s) => s.toggleMotion);
  const habitatHidden = useAtlas((s) => s.habitatHidden);
  const toggleHabitat = useAtlas((s) => s.toggleHabitat);
  const zooMode = useAtlas((s) => s.zooMode);
  const zooHabitat = useAtlas((s) => s.zooHabitat);
  const zooSelectedIds = useAtlas((s) => s.zooSelectedIds);
  const zooPlaying = useAtlas((s) => s.zooPlaying);
  const toggleZooPlaying = useAtlas((s) => s.toggleZooPlaying);
  const toggleZooSpecies = useAtlas((s) => s.toggleZooSpecies);
  const displayedHabitat = zooMode ? zooHabitat : (active.model.habitat ?? 'savanna');

  const beginZoom = useCallback(
    (factor: number, immediate = false) => {
      if (controls.zoom * factor > 1.2) setDetail(true);
      if (immediate) zoomByImmediate(factor);
      else zoomBy(factor);
    },
    [setDetail],
  );

  const handleReset = useCallback(() => {
    setDetail(false);
    resetView();
  }, [setDetail]);

  useEffect(() => {
    const el = ref.current!;
    const pointers = new Map<number, PointerPosition>();
    let lastX = 0;
    let lastY = 0;
    let lastT = 0;
    let pinching = false;
    let pinchDistance = 0;

    const down = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest('button')) return;
      interruptView();
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      el.setPointerCapture(e.pointerId);

      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinching = true;
        pinchDistance = distance(a, b);
        controls.dragging = false;
        el.classList.remove('is-dragging');
        return;
      }

      controls.dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = performance.now();
      el.classList.add('is-dragging');
    };

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      controls.pointerX = ((e.clientX - r.left) / Math.max(1, r.width)) * 2 - 1;
      controls.pointerY = ((e.clientY - r.top) / Math.max(1, r.height)) * 2 - 1;

      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinching && pointers.size >= 2) {
        const [a, b] = [...pointers.values()];
        const nextDistance = distance(a, b);
        if (pinchDistance > 0 && nextDistance > 0) beginZoom(nextDistance / pinchDistance, true);
        pinchDistance = nextDistance;
        return;
      }

      if (!controls.dragging) {
        emitViewChange();
        return;
      }

      const now = performance.now();
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      controls.rotY += dx * 0.009;
      controls.rotX = Math.max(-0.6, Math.min(0.6, controls.rotX + dy * 0.005));
      controls.velY = (dx * 0.009) / Math.max(1, now - lastT);
      lastX = e.clientX;
      lastY = e.clientY;
      lastT = now;
      emitViewChange();
    };

    const up = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId);

      if (pinching) {
        if (pointers.size < 2) {
          pinching = false;
          pinchDistance = 0;
          controls.dragging = false;
          el.classList.remove('is-dragging');
        }
        return;
      }

      if (!controls.dragging) return;
      controls.dragging = false;
      if (performance.now() - lastT > 80 || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        controls.velY = 0;
      }
      el.classList.remove('is-dragging');
    };

    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      beginZoom(e.deltaY > 0 ? 0.9 : 1.11);
    };

    // Momentum after release uses elapsed time rather than frame count.
    let raf = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(50, now - previous);
      previous = now;
      if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) controls.velY = 0;
      if (!controls.dragging && !pinching && Math.abs(controls.velY) > 0.000001) {
        controls.rotY += controls.velY * dt;
        controls.velY *= Math.exp(-dt / 160);
        emitViewChange();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [beginZoom]);

  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, () => void> = {
      ArrowLeft: () => nudge(-0.4),
      ArrowRight: () => nudge(0.4),
      '+': () => beginZoom(1.25),
      '=': () => beginZoom(1.25),
      '-': () => beginZoom(0.8),
      '0': handleReset,
      Escape: handleReset,
      h: toggleHabitat,
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.();
  };

  return (
    <section
      id="stage"
      ref={ref}
      className="stage"
      data-habitat={displayedHabitat}
      tabIndex={0}
      onKeyDown={onKey}
      aria-label={t('stage.aria')}
    >
      <div className="vitrine-frame" aria-hidden="true">
        <span className="vitrine-badge">
          <span className="vitrine-dot" />
          {t(`habitats.${displayedHabitat}`)}
        </span>
      </div>
      {!zooMode && (!modelReady || modelError) && (
        <div className={modelError ? 'model-status is-error' : 'model-status'} role={modelError ? 'alert' : 'status'}>
          <img src={thumbnailUrl(active.id)} alt="" width={140} height={90} />
          <div>
            <strong>{modelError ? t('stage.loadError', { name: modelError }) : t('stage.loading')}</strong>
            <span>
              {modelError ? t('stage.loadErrorHint') : t('stage.loadingHint')}
            </span>
          </div>
        </div>
      )}

      {detail && (
        <button className="detail-exit" onClick={handleReset}>
          <Icon name="close" width={15} height={15} />
          {t('stage.exitDetail')}
        </button>
      )}

      <div className="tools" role="toolbar" aria-label={t('stage.toolbar')} aria-orientation="vertical">
        <button className="tool" onClick={() => beginZoom(1.35)} aria-label={t('stage.zoomIn')}>
          <Icon name="zoomIn" />
        </button>
        <button className="tool" onClick={() => beginZoom(0.74)} aria-label={t('stage.zoomOut')}>
          <Icon name="zoomOut" />
        </button>
        <button className="tool" onClick={toggleFullscreen} aria-label={t('stage.fullscreen')}>
          <Icon name="expand" />
        </button>
        <button
          className="tool"
          onClick={toggleMotion}
          aria-label={motionPaused ? t('stage.resumeMotion') : t('stage.pauseMotion')}
          aria-pressed={motionPaused}
        >
          <Icon name={motionPaused ? 'play' : 'pause'} />
        </button>
        <button
          className="tool"
          onClick={toggleHabitat}
          aria-label={habitatHidden ? t('stage.showHabitat') : t('stage.hideHabitat')}
          aria-pressed={habitatHidden}
        >
          <Icon name={habitatHidden ? 'eyeOff' : 'eye'} />
        </button>
        <button
          className="tool tool-accent"
          onClick={() => setTheme(theme === 'day' ? 'night' : 'day')}
          aria-label={theme === 'day' ? t('stage.toNight') : t('stage.toDay')}
        >
          <Icon name={theme === 'day' ? 'moon' : 'sun'} />
        </button>
      </div>

      {zooMode ? (
        <div className="zoo-bar">
          <button
            type="button"
            className={`zoo-play-btn${zooPlaying ? ' is-playing' : ''}`}
            onClick={toggleZooPlaying}
            disabled={zooSelectedIds.length === 0}
          >
            <Icon name={zooPlaying ? 'pause' : 'play'} width={15} height={15} />
            <span>{zooPlaying ? t('zoo.pause') : t('zoo.play')}</span>
          </button>
          <div className="zoo-chips" role="list" aria-label={t('zoo.activeAnimals')}>
            {zooSelectedIds.length === 0 ? (
              <span className="zoo-empty-hint">{t('zoo.emptyHint')}</span>
            ) : (
              zooSelectedIds.map((id) => {
                const sp = byId(id);
                const label = t(`species.${id}.name`, { defaultValue: sp.name });
                return (
                  <button
                    key={id}
                    type="button"
                    className="zoo-chip"
                    onClick={() => toggleZooSpecies(id)}
                    title={t('zoo.removeAnimal', { name: label })}
                  >
                    <img src={thumbnailUrl(id)} alt="" width={22} height={22} />
                    <span>{label}</span>
                    <Icon name="close" width={11} height={11} />
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : (
        <div className="spin-pill">
          <button onClick={() => spin(-1)} aria-label={t('stage.spinLeft')}>
            <Icon name="rotL" width={15} height={15} />
          </button>
          <button className="spin-label" onClick={handleReset} aria-label={t('stage.resetView')}>
            360°
          </button>
          <button onClick={() => spin(1)} aria-label={t('stage.spinRight')}>
            <Icon name="rotR" width={15} height={15} />
          </button>
        </div>
      )}
    </section>
  );
}
