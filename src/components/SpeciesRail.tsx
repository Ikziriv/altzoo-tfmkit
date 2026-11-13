import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useGLTF } from '@react-three/drei';
import { useSpeciesList } from '../data/localize';
import { thumbnailUrl } from '../data/thumbnails';
import { useAtlas, ZOO_MAX_ANIMALS } from '../store';
import { Icon } from './Icon';

export function SpeciesRail() {
  const { t } = useTranslation();
  const {
    activeId,
    group,
    query,
    select,
    railLayout,
    setRailLayout,
    zooMode,
    zooHabitat,
    zooSelectedIds,
    toggleZooSpecies,
    selectAllZooHabitat,
    clearZooSpecies,
  } = useAtlas();
  const species = useSpeciesList();

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (zooMode) {
      return species.filter(
        (s) =>
          (s.model.habitat ?? 'savanna') === zooHabitat &&
          (!q || [s.name, s.latin, s.habitat, ...s.tags].some((v) => v.toLowerCase().includes(q))),
      );
    }
    return species.filter(
      (s) =>
        (group === 'featured' || s.groups.includes(group)) &&
        (!q || [s.name, s.latin, s.habitat, ...s.tags].some((v) => v.toLowerCase().includes(q))),
    );
  }, [species, group, query, zooMode, zooHabitat]);

  return (
    <div className="rail-wrap">
      <div className="rail-head">
        <span className="rail-count">
          {zooMode
            ? t('zoo.selectedCount', { count: zooSelectedIds.length, max: ZOO_MAX_ANIMALS, habitat: t(`zoo.habitatsShort.${zooHabitat}`) })
            : t('rail.count', { count: list.length })}
        </span>
        <div className="rail-actions">
          {zooMode && (
            <div className="rail-zoo-btns">
              <button type="button" className="rail-pill-btn" onClick={selectAllZooHabitat}>
                {t('zoo.selectAll')}
              </button>
              <button type="button" className="rail-pill-btn" onClick={clearZooSpecies} disabled={zooSelectedIds.length === 0}>
                {t('zoo.clear')}
              </button>
            </div>
          )}
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
      </div>
      <div
        className={`rail${railLayout === 'row' ? ' is-row' : ''}${zooMode ? ' is-zoo-rail' : ''}`}
        role="group"
        aria-label={t('rail.aria')}
      >
        {list.map((s) => {
          const isSelected = zooMode ? zooSelectedIds.includes(s.id) : s.id === activeId;
          return (
            <button
              key={s.id}
              aria-pressed={isSelected}
              className="card"
              onPointerEnter={() => s.model.url && useGLTF.preload(s.model.url)}
              onClick={(e) => {
                if (zooMode) {
                  toggleZooSpecies(s.id);
                  return;
                }
                const r = e.currentTarget.querySelector('img')!.getBoundingClientRect();
                select(s.id, { x: r.left, y: r.top, width: r.width, height: r.height });
              }}
            >
              {zooMode && (
                <span className={`card-check${isSelected ? ' is-on' : ''}`} aria-hidden="true">
                  {isSelected && <Icon name="check" width={11} height={11} />}
                </span>
              )}
              <img src={thumbnailUrl(s.id)} alt="" width={84} height={56} />
              <span className="card-text">
                <span className="card-name">{s.name}</span>
                <span className="card-latin">{s.latin}</span>
              </span>
            </button>
          );
        })}
        {list.length === 0 && <p className="rail-empty">{t('rail.empty', { query })}</p>}
      </div>
    </div>
  );
}
