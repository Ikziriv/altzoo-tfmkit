import { useTranslation } from 'react-i18next';
import { GROUPS, SPECIES, type GroupId } from '../data/species';
import { useSpecies } from '../data/localize';
import { thumbnailUrl } from '../data/thumbnails';
import { useAtlas } from '../store';
import { focus } from '../three/controls';
import type { HabitatId } from '../three/habitat/specs';
import { Icon, type IconName } from './Icon';
import { LanguageSwitcher } from './LanguageSwitcher';

const GROUP_ICONS: Record<GroupId | 'featured', IconName> = {
  featured: 'star',
  mammals: 'paw',
  birds: 'feather',
  reptiles: 'scale',
  ocean: 'wave',
  abyss: 'abyss',
  savanna: 'grass',
};

const HABITAT_NAV: { id: HabitatId; icon: IconName }[] = [
  { id: 'savanna', icon: 'grass' },
  { id: 'forest', icon: 'tree' },
  { id: 'wetland', icon: 'feather' },
  { id: 'reef', icon: 'wave' },
  { id: 'abyss', icon: 'abyss' },
  { id: 'polar', icon: 'scale' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const group = useAtlas((s) => s.group);
  const setGroup = useAtlas((s) => s.setGroup);
  const setDetail = useAtlas((s) => s.setDetail);
  const active = useSpecies(useAtlas((s) => s.activeId));
  const navCollapsed = useAtlas((s) => s.navCollapsed);
  const toggleNav = useAtlas((s) => s.toggleNav);
  const zooMode = useAtlas((s) => s.zooMode);
  const setZooMode = useAtlas((s) => s.setZooMode);
  const zooHabitat = useAtlas((s) => s.zooHabitat);
  const setZooHabitat = useAtlas((s) => s.setZooHabitat);

  return (
    <aside className="sidebar">
      <div className="sidebar-head">
        <a className="brand" href="/" aria-label={t('brand.home')}>
          <span className="brand-mark" aria-hidden="true" />
          <span>
            {t('brand.name')}
            <small>{t('brand.tagline')}</small>
          </span>
        </a>
        <button
          className="icon-btn collapse-btn"
          onClick={toggleNav}
          title={navCollapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          aria-expanded={!navCollapsed}
        >
          <Icon name="panelL" width={16} height={16} />
        </button>
      </div>

      <div className="mode-switch" role="tablist" aria-label={t('zoo.modeLabel')}>
        <button
          role="tab"
          aria-selected={!zooMode}
          className={!zooMode ? 'is-active' : ''}
          data-tooltip={t('zoo.vitrine')}
          onClick={() => setZooMode(false)}
        >
          <Icon name="eye" width={15} height={15} />
          <span className="mode-label">{t('zoo.vitrine')}</span>
        </button>
        <button
          role="tab"
          aria-selected={zooMode}
          className={zooMode ? 'is-active' : ''}
          data-tooltip={t('zoo.zooMode')}
          onClick={() => setZooMode(true)}
        >
          <Icon name="paw" width={15} height={15} />
          <span className="mode-label">{t('zoo.zooMode')}</span>
        </button>
      </div>

      <nav className="nav" aria-label={zooMode ? t('zoo.habitatNav') : t('nav.collections')}>
        <p className="nav-section" aria-hidden="true">
          {zooMode ? t('zoo.habitatNav') : t('nav.collections')}
        </p>
        {zooMode
          ? HABITAT_NAV.map((h) => {
            const count = SPECIES.filter((s) => (s.model.habitat ?? 'savanna') === h.id).length;
            const label = t(`zoo.habitatsShort.${h.id}`);
            return (
              <button
                key={h.id}
                className="nav-item"
                data-tooltip={`${label} (${count})`}
                title={label}
                aria-pressed={zooHabitat === h.id}
                onClick={() => setZooHabitat(h.id)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon name={h.icon} />
                </span>
                <span className="nav-label">{label}</span>
                <span className="nav-badge" aria-label={t('nav.count', { count })}>
                  {count}
                </span>
              </button>
            );
          })
          : GROUPS.map((g) => {
            const count =
              g.id === 'featured' ? SPECIES.length : SPECIES.filter((s) => s.groups.includes(g.id as GroupId)).length;
            return (
              <button
                key={g.id}
                className="nav-item"
                data-tooltip={`${t(`groups.${g.id}`)} (${count})`}
                title={t(`groups.${g.id}`)}
                aria-pressed={group === g.id}
                onClick={() => setGroup(g.id)}
              >
                <span className="nav-icon" aria-hidden="true">
                  <Icon name={GROUP_ICONS[g.id]} />
                </span>
                <span className="nav-label">{t(`groups.${g.id}`)}</span>
                <span className="nav-badge" aria-label={t('nav.count', { count })}>
                  {count}
                </span>
              </button>
            );
          })}
      </nav>

      <div className="sidebar-foot">
        <article className="featured" key={`${active.id}-${active.name}`}>
          <div className="featured-head">
            <p className="eyebrow">{t('featured.eyebrow')}</p>
            <img className="featured-thumb" src={thumbnailUrl(active.id)} alt="" width={68} height={46} />
          </div>
          <h2>{active.featured.headline}</h2>
          <p className="featured-copy">{active.featured.text}</p>
          <button className="link" onClick={() => { setDetail(true); focus(active.closeup); }}>
            {t('featured.lookCloser')} <Icon name="arrow" width={14} height={14} />
          </button>
        </article>

        <button
          type="button"
          className="featured-mini"
          data-tooltip={`${active.name} — ${t('featured.lookCloser')}`}
          title={`${active.name} — ${t('featured.lookCloser')}`}
          onClick={() => { setDetail(true); focus(active.closeup); }}
        >
          <img src={thumbnailUrl(active.id)} alt={active.name} width={36} height={36} />
        </button>

        <LanguageSwitcher />
      </div>
    </aside>
  );
}
