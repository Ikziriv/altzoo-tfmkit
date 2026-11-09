import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n';
import { Icon } from './Icon';

export function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ left?: number; right?: number; top?: number; bottom?: number }>({});

  const current =
    LANGUAGES.find((l) => l.code === i18n.resolvedLanguage) ?? LANGUAGES[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const dismiss = () => setOpen(false);
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', key);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', key);
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  const toggle = () => {
    if (!open && btn.current) {
      const r = btn.current.getBoundingClientRect();
      const up = r.top > window.innerHeight * 0.6;
      setPos(
        up
          ? { left: r.left, bottom: window.innerHeight - r.top + 8 }
          : { right: window.innerWidth - r.right, top: r.bottom + 8 },
      );
    }
    setOpen((o) => !o);
  };

  return (
    <div className="lang" ref={root}>
      <button
        ref={btn}
        type="button"
        className={compact ? 'icon-btn lang-btn' : 'nav-item lang-btn'}
        title={t('language.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={toggle}
      >
        <Icon name="globe" />
        {!compact && (
          <span className="nav-label">
            {t('language.label')}
            <small>{current.label}</small>
          </span>
        )}
        {!compact && <Icon name="chevron" className="lang-caret" width={13} height={13} />}
      </button>
      {open && (
        <div className="lang-menu" role="listbox" aria-label={t('language.label')} style={pos}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              role="option"
              aria-selected={l.code === current.code}
              className="lang-option"
              onClick={() => {
                i18n.changeLanguage(l.code);
                setOpen(false);
              }}
            >
              <span className="lang-option-name">{l.label}</span>
              <span className="lang-option-en">{l.en}</span>
              <Icon name="check" className="lang-option-check" width={13} height={13} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
