import type { SVGProps } from 'react';

export type IconName =
  | 'home' | 'star' | 'paw' | 'feather' | 'wave' | 'grass' | 'tree' | 'shell' | 'abyss' | 'scale' | 'depth'
  | 'search' | 'bell' | 'zoomIn' | 'zoomOut' | 'expand' | 'sun' | 'moon' | 'pause' | 'play' | 'close'
  | 'eye' | 'eyeOff'
  | 'rotL' | 'rotR' | 'ruler' | 'weight' | 'wing' | 'diet' | 'globe' | 'chevron' | 'arrow'
  | 'panelL' | 'panelR' | 'grid' | 'rows' | 'check';

const PATHS: Record<IconName, JSX.Element> = {
  home: <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
  paw: (
    <>
      <circle cx="7" cy="9" r="1.8" /><circle cx="11" cy="5.8" r="1.8" /><circle cx="15.5" cy="6.5" r="1.8" /><circle cx="18.5" cy="10.5" r="1.8" />
      <path d="M8.5 16.5c0-2.6 2-5 4.3-5s4.2 2.2 4.2 4.6c0 2-1.4 3.4-3.2 3-1-.2-1.6-.6-2.4-.3-1.7.7-2.9-.2-2.9-2.3z" />
    </>
  ),
  feather: <path d="M20 4c-6 0-11 4.5-11 11v5M9 15h6M11 11h6.5M20 4c0 7-4 12-11 12" />,
  wave: <path d="M2 9c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2M2 15c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />,
  grass: <path d="M3 20h18M6 20c0-5-2-8-3-9M10 20c0-7 1-11 3-13M14 20c0-4 2-7 4-8M18 20c0-3 1-5 3-6" />,
  tree: <path d="M12 21v-6M12 3 5.5 12h3L5 16.5h14L15.5 12h3z" />,
  shell: <path d="M12 19a7 7 0 1 0-7-7c0 2.8 1.8 5 4.2 5a2.8 2.8 0 0 0 2.8-2.8c0-1.3-1-2.2-2.2-2.2" />,
  abyss: <><path d="M12 3c4 2.5 6 5.5 6 9a6 6 0 0 1-12 0c0-3.5 2-6.5 6-9z" /><path d="M9 17v4M12 18v3M15 17v4" /></>,
  scale: <path d="M4 15c2.5-3 5.5-4.5 9-4.5s6 1.5 7 3.5c-1.5 2-4 3.5-7 3.5S6.5 16 4 15zM15 12.5h.01" />,
  depth: <path d="M12 4v15M8 15l4 4 4-4M5 4h14" />,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0" />,
  zoomIn: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M11 8.3v5.4M8.3 11h5.4" /></>,
  zoomOut: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2M8.3 11h5.4" /></>,
  expand: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  pause: <path d="M8 5v14M16 5v14" />,
  play: <path d="m8 5 11 7-11 7z" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  eye: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" /><circle cx="12" cy="12" r="2.8" /></>,
  eyeOff: <><path d="m3 3 18 18" /><path d="M10.6 5.1A11 11 0 0 1 12 5c6.5 0 10 7 10 7a17.6 17.6 0 0 1-3.2 3.9M6.6 6.6C4 8.3 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.7-1.2M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  rotL: <path d="M4 5v5h5M4.6 14a8 8 0 1 0 1.8-8.3L4 10" />,
  rotR: <path d="M20 5v5h-5M19.4 14a8 8 0 1 1-1.8-8.3L20 10" />,
  ruler: <path d="m3 17 14-14 4 4L7 21zM7 13l2 2M10 10l2 2M13 7l2 2" />,
  weight: <path d="M6.5 8h11l2.5 12H4zM9.5 8a2.5 2.5 0 1 1 5 0" />,
  wing: <path d="M3 13c4-1 7-4 9-8 2 4 5 7 9 8-3 1-5 3-6 6-1-2-2-3-3-3s-2 1-3 3c-1-3-3-5-6-6z" />,
  diet: <path d="M7 3v8a2 2 0 0 0 4 0V3M9 11v10M16 21V3c2 1 3 4 3 7s-1 4-3 4" />,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.6 2.6 3.8 5.6 3.8 9s-1.2 6.4-3.8 9c-2.6-2.6-3.8-5.6-3.8-9S9.4 5.6 12 3z" /></>,
  chevron: <path d="m9 5 7 7-7 7" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  panelL: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 5v14" /></>,
  panelR: <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M14 5v14" /></>,
  grid: <><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>,
  rows: <><rect x="3" y="4" width="18" height="6.5" rx="2" /><rect x="3" y="13.5" width="18" height="6.5" rx="2" /></>,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
};

export function Icon({ name, ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

