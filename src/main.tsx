import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './i18n';
import './styles.css';

const SnapScene = lazy(() => import('./three/SnapScene').then((module) => ({ default: module.SnapScene })));

const params = new URLSearchParams(location.search);
const snap = params.get('snap');
const snapYaw = params.get('yaw');

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={null}>
      {snap ? <SnapScene id={snap} yaw={snapYaw === null ? undefined : Number(snapYaw)} /> : <App />}
    </Suspense>
  </StrictMode>,
);

