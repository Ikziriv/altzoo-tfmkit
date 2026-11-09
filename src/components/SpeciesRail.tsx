import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSpeciesList } from '../data/localize';
import { thumbnailUrl } from '../data/thumbnails';
import { useAtlas } from '../store';
import { Icon } from './Icon';

export function SpeciesRail() {
  const { t } = useTranslation();
  const { activeId, group, query, select, railLayout, setRailLayout } = useAtlas();
  const species = useSpeciesList();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return species.filter(
      (s) =>
        (group === 'featured' || s.groups.includes(group)) &&
        (!q || [s.name, s.latin, s.habitat, ...s.tags].some((v) => v.toLowerCase().includes(q))),
    );
  }, [species, group, query]);

  return (
    <div className="rail-wrap">
      <div className="rail-head">
        <span className="rail-count">{t('rail.count', { count: list.length })}</span>
        <div className="rail-view" role="group" aria-label={t('rail.layout')}>
          <button
            aria-pressed={railLayout === 'card'}
            onClick={() => setRailLayout('card')}
            title={t('rail.cards')}
          >
            <Icon name="grid" width={14} height={14} />
          </button>
          <button
            aria-pressed={railLayout === 'row'}
            onClick={() => setRailLayout('row')}
            title={t('rail.rows')}
          >
            <Icon name="rows" width={14} height={14} />
          </button>
        </div>
      </div>
      <div
        className={`rail${railLayout === 'row' ? ' is-row' : ''}`}
        role="group"
        aria-label={t('rail.aria')}
      >
        {list.map((s) => (
          <button
            key={s.id}
            aria-pressed={s.id === activeId}
            className="card"
            onClick={(e) => {
              const r = e.currentTarget.querySelector('img')!.getBoundingClientRect();
              select(s.id, { x: r.left, y: r.top, width: r.width, height: r.height });
            }}
          >
            <img src={thumbnailUrl(s.id)} alt="" width={84} height={56} />
            <span className="card-text">
              <span className="card-name">{s.name}</span>
              <span className="card-latin">{s.latin}</span>
            </span>
          </button>
        ))}
        {list.length === 0 && <p className="rail-empty">{t('rail.empty', { query })}</p>}
      </div>
    </div>
  );
}
