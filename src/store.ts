import { create } from 'zustand';
import type { GroupId } from './data/species';

export type Theme = 'day' | 'night';
export type RailLayout = 'card' | 'row';

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AtlasState {
  activeId: string;
  /** Screen rect of the card that triggered the latest selection; the new animal emerges from it. */
  originRect: Rect | null;
  /** Bumps on every selection so the scene can tell repeat clicks apart. */
  selectionSeq: number;
  theme: Theme;
  soundEnabled: boolean;
  motionPaused: boolean;
  habitatHidden: boolean;
  detail: boolean;
  modelReady: boolean;
  modelError: string | null;
  group: GroupId | 'featured';
  query: string;
  navCollapsed: boolean;
  panelCollapsed: boolean;
  railLayout: RailLayout;
  select: (id: string, originRect: Rect | null) => void;
  setTheme: (t: Theme) => void;
  toggleSound: () => void;
  toggleMotion: () => void;
  toggleHabitat: () => void;
  setDetail: (detail: boolean) => void;
  setModelReady: (ready: boolean) => void;
  setModelError: (name: string | null) => void;
  setGroup: (g: GroupId | 'featured') => void;
  setQuery: (q: string) => void;
  toggleNav: () => void;
  togglePanel: () => void;
  setRailLayout: (l: RailLayout) => void;
}

const prefersNight =
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches;

export const useAtlas = create<AtlasState>((set, get) => ({
  activeId: 'fox',
  originRect: null,
  selectionSeq: 0,
  theme: prefersNight ? 'night' : 'day',
  soundEnabled: true,
  motionPaused: false,
  habitatHidden: false,
  detail: false,
  modelReady: false,
  modelError: null,
  group: 'featured',
  query: '',
  navCollapsed: false,
  panelCollapsed: false,
  railLayout: 'card',
  select: (id, originRect) => {
    if (id === get().activeId) return;
    set((s) => ({ activeId: id, originRect, selectionSeq: s.selectionSeq + 1, detail: false, modelReady: false, modelError: null }));
  },
  setTheme: (theme) => set({ theme }),
  toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),
  toggleMotion: () => set((s) => ({ motionPaused: !s.motionPaused })),
  toggleHabitat: () => set((s) => ({ habitatHidden: !s.habitatHidden })),
  setDetail: (detail) => set({ detail }),
  setModelReady: (modelReady) => set({ modelReady }),
  setModelError: (modelError) => set({ modelError }),
  setGroup: (group) => set({ group }),
  setQuery: (query) => set({ query }),
  toggleNav: () => set((s) => ({ navCollapsed: !s.navCollapsed })),
  togglePanel: () => set((s) => ({ panelCollapsed: !s.panelCollapsed })),
  setRailLayout: (railLayout) => set({ railLayout }),
}));

