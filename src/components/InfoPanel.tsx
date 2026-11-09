import { Trans, useTranslation } from 'react-i18next';
import { useSpecies } from '../data/localize';
import { thumbnailUrl } from '../data/thumbnails';
import { useAtlas } from '../store';
import { focus } from '../three/controls';
import { Icon } from './Icon';

export function InfoPanel() {
  const { t, i18n } = useTranslation();
  const s = useSpecies(useAtlas((st) => st.activeId));
  const setDetail = useAtlas((st) => st.setDetail);
  const thumbnail = thumbnailUrl(s.id);
  let i = 0;
  const r = () => ({ style: { '--i': i++ } as React.CSSProperties, className: 'reveal' });

  return (
    // Keyed by species and language so the staggered reveal replays on every switch.
    <article className="panel" key={`${s.id}-${i18n.language}`} aria-live="polite">
      <p {...r()} className="reveal eyebrow">{s.family}</p>
      <h1 {...r()} className="reveal title">{s.name}</h1>
      <p {...r()} className="reveal latin">{s.latin}</p>
      <ul {...r()} className="reveal tags">
        {s.tags.map((tag) => (
          <li key={tag}>{tag}</li>
        ))}
      </ul>
      <p {...r()} className="reveal body">{s.description}</p>

      <h2 {...r()} className="reveal section">{t('panel.keyTraits')}</h2>
      <dl className="traits">
        {s.traits.map((trait) => (
          <div key={`${trait.icon}-${trait.label}`} {...r()}>
            <dt>
              <Icon name={trait.icon} width={16} height={16} />
              {trait.label}
            </dt>
            <dd>{trait.value}</dd>
          </div>
        ))}
      </dl>

      <h2 {...r()} className="reveal section">{t('panel.habitat')}</h2>
      <p {...r()} className="reveal habitat">
        <Icon name="wave" width={16} height={16} />
        {s.habitat}
      </p>

      <button {...r()} className="reveal closeup" onClick={() => { setDetail(true); focus(s.closeup); }}>
        <span className="closeup-img" style={{ backgroundImage: thumbnail ? `url(${thumbnail})` : undefined }} aria-hidden="true" />
        <span className="closeup-text">
          <strong>{s.closeup.title}</strong>
          <span>{s.closeup.text}</span>
        </span>
        <Icon name="chevron" />
      </button>

      {s.model.credit && (
        <p {...r()} className="reveal credit">
          <Trans
            i18nKey="panel.credit"
            values={{ title: s.model.credit.title, author: s.model.credit.author }}
            components={[
              s.model.credit.url ? (
                <a href={s.model.credit.url} target="_blank" rel="noreferrer" />
              ) : (
                <span />
              ),
            ]}
          />
          {` · ${s.model.credit.license}`}
        </p>
      )}
    </article>
  );
}
