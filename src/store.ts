import { create } from 'zustand';
import { byId, SPECIES, type GroupId } from './data/species';
import type { HabitatId } from './three/habitat/specs';

export type Theme = 'day' | 'night';
export type RailLayout = 'card' | 'row';

export const ZOO_MAX_ANIMALS = 6;

const DEFAULT_ZOO_SEEDS: Record<HabitatId, string[]> = {
  savanna: ['zebra', 'lion', 'giraffe'],
  forest: ['wolf', 'stag', 'panda'],
  wetland: ['flamingo', 'crocodile', 'treefrog'],
  reef: ['clownfish', 'bluetang', 'shark'],
  abyss: ['anglerfish', 'dumbo', 'jellyfish'],
  polar: ['penguin'],
};

export function defaultZooSpeciesFor(habitat: HabitatId): string[] {
  const native = SPECIES.filter((s) => (s.model.habitat ?? 'savanna') === habitat).map((s) => s.id);
  const seeded = (DEFAULT_ZOO_SEEDS[habitat] ?? []).filter((id) => native.includes(id));
  if (seeded.length > 0) return seeded.slice(0, ZOO_MAX_ANIMALS);
  return native.slice(0, 3);
}

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
  zooMode: boolean;
  zooHabitat: HabitatId;
  zooSelectedIds: string[];
  zooPlaying: boolean;
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
  setZooMode: (enabled: boolean) => void;
  setZooHabitat: (h: HabitatId) => void;
  toggleZooSpecies: (id: string) => void;
  selectAllZooHabitat: () => void;
  clearZooSpecies: () => void;
  setZooPlaying: (playing: boolean) => void;
  toggleZooPlaying: () => void;
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
  zooMode: false,
  zooHabitat: 'savanna',
  zooSelectedIds: defaultZooSpeciesFor('savanna'),
  zooPlaying: false,
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
  setZooMode: (enabled) =>
    set((s) => {
      if (!enabled) return { zooMode: false, zooPlaying: false };
      const currentHabitat = (byId(s.activeId).model.habitat ?? 'savanna') as HabitatId;
      const seeded = [s.activeId, ...defaultZooSpeciesFor(currentHabitat).filter((id) => id !== s.activeId)].slice(
        0,
        ZOO_MAX_ANIMALS,
      );
      return {
        zooMode: true,
        zooHabitat: currentHabitat,
        zooSelectedIds: seeded,
        zooPlaying: false,
        detail: false,
        habitatHidden: false,
      };
    }),
  setZooHabitat: (zooHabitat) =>
    set(() => {
      const seeded = defaultZooSpeciesFor(zooHabitat);
      const firstId = seeded[0];
      return {
        zooHabitat,
        zooSelectedIds: seeded,
        ...(firstId ? { activeId: firstId } : {}),
      };
    }),
  toggleZooSpecies: (id) =>
    set((s) => {
      const exists = s.zooSelectedIds.includes(id);
      if (exists) {
        return { zooSelectedIds: s.zooSelectedIds.filter((x) => x !== id) };
      }
      if (s.zooSelectedIds.length >= ZOO_MAX_ANIMALS) {
        return { zooSelectedIds: [...s.zooSelectedIds.slice(1), id] };
      }
      return { zooSelectedIds: [...s.zooSelectedIds, id], activeId: id };
    }),
  selectAllZooHabitat: () =>
    set((s) => {
      const native = SPECIES.filter((sp) => (sp.model.habitat ?? 'savanna') === s.zooHabitat).map((sp) => sp.id);
      return { zooSelectedIds: native.slice(0, ZOO_MAX_ANIMALS) };
    }),
  clearZooSpecies: () => set({ zooSelectedIds: [] }),
  setZooPlaying: (zooPlaying) => set({ zooPlaying }),
  toggleZooPlaying: () => set((s) => ({ zooPlaying: !s.zooPlaying })),
}));

