import { useTranslation } from 'react-i18next';
import { GROUPS, SPECIES, type GroupId } from '../data/species';
import { useSpecies } from '../data/localize';
import { thumbnailUrl } from '../data/thumbnails';
import { useAtlas } from '../store';
import { focus } from '../three/controls';
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

export function Sidebar() {
  const { t } = useTranslation();
  const group = useAtlas((s) => s.group);
  const setGroup = useAtlas((s) => s.setGroup);
  const setDetail = useAtlas((s) => s.setDetail);
  const active = useSpecies(useAtlas((s) => s.activeId));
  const navCollapsed = useAtlas((s) => s.navCollapsed);
  const toggleNav = useAtlas((s) => s.toggleNav);

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

      <nav className="nav" aria-label={t('nav.collections')}>
        <button className="nav-item" title={t('nav.home')} onClick={() => setGroup('featured')}>
          <Icon name="home" />
          <span className="nav-label">{t('nav.home')}</span>
        </button>
        {GROUPS.map((g) => {
          const count =
            g.id === 'featured' ? SPECIES.length : SPECIES.filter((s) => s.groups.includes(g.id as GroupId)).length;
          return (
            <button
              key={g.id}
              className="nav-item"
              title={t(`groups.${g.id}`)}
              aria-pressed={group === g.id}
              onClick={() => setGroup(g.id)}
            >
              <Icon name={GROUP_ICONS[g.id]} />
              <span className="nav-label">
                {t(`groups.${g.id}`)}
                {g.id !== 'featured' && <small>{t('nav.count', { count })}</small>}
              </span>
            </button>
          );
        })}
      </nav>

      <article className="featured" key={`${active.id}-${active.name}`}>
        <p className="eyebrow">{t('featured.eyebrow')}</p>
        <img className="featured-thumb" src={thumbnailUrl(active.id)} alt="" width={160} height={107} />
        <h2>{active.featured.headline}</h2>
        <p>{active.featured.text}</p>
        <button className="link" onClick={() => { setDetail(true); focus(active.closeup); }}>
          {t('featured.lookCloser')} <Icon name="arrow" width={14} height={14} />
        </button>
      </article>

      <LanguageSwitcher />
    </aside>
  );
}
