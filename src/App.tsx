import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpecies } from './data/localize';
import { useAtlas } from './store';
import { Sidebar } from './components/Sidebar';
import { SpeciesRail } from './components/SpeciesRail';
import { Stage } from './components/Stage';
import { InfoPanel } from './components/InfoPanel';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Icon } from './components/Icon';

const Scene = lazy(() => import('./three/Scene').then((module) => ({ default: module.Scene })));

export function App() {
  const { t } = useTranslation();
  const theme = useAtlas((s) => s.theme);
  const query = useAtlas((s) => s.query);
  const setQuery = useAtlas((s) => s.setQuery);
  const active = useSpecies(useAtlas((s) => s.activeId));
  const detail = useAtlas((s) => s.detail);
  const navCollapsed = useAtlas((s) => s.navCollapsed);
  const panelCollapsed = useAtlas((s) => s.panelCollapsed);
  const togglePanel = useAtlas((s) => s.togglePanel);
  const zooMode = useAtlas((s) => s.zooMode);
  const zooHabitat = useAtlas((s) => s.zooHabitat);
  const zooSelectedIds = useAtlas((s) => s.zooSelectedIds);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const appClass = [
    'app',
    detail && 'is-detail',
    navCollapsed && 'is-nav-collapsed',
    panelCollapsed && 'is-panel-collapsed',
    zooMode && 'is-zoo-mode',
  ].filter(Boolean).join(' ');

  return (
    <>
      <a className="skip-link" href="#stage">{t('app.skip')}</a>
      <div className={appClass}>
        <Sidebar />

        <main className="center">
          <SpeciesRail />
          <Stage />
          <p className="caption" key={zooMode ? `zoo-${zooHabitat}` : `${active.id}-${active.name}`}>
            {zooMode
              ? t('zoo.caption', { count: zooSelectedIds.length, habitat: t(`habitats.${zooHabitat}`) })
              : active.caption}
          </p>
        </main>

        <aside className="side">
          <header className="topbar">
            <button
              className="icon-btn collapse-btn"
              onClick={togglePanel}
              title={t('panel.collapse')}
              aria-expanded={!panelCollapsed}
            >
              <Icon name="panelR" width={16} height={16} />
            </button>
            <label className="search">
              <Icon name="search" width={15} height={15} />
              <span className="sr-only">{t('search.label')}</span>
              <input
                type="search"
                name="species-search"
                autoComplete="off"
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
            <LanguageSwitcher compact />
          </header>
          <div className="side-rail">
            <button
              className="icon-btn"
              onClick={togglePanel}
              title={t('panel.expand')}
              aria-expanded={!panelCollapsed}
            >
              <Icon name="panelR" width={16} height={16} />
            </button>
            <span className="side-rail-label" aria-hidden="true">{t('panel.notes')}</span>
            <LanguageSwitcher compact />
          </div>
          <InfoPanel />
        </aside>
      </div>

      <Suspense fallback={null}>
        <Scene />
      </Suspense>
      <div className="grain" aria-hidden="true" />
    </>
  );
}
