import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

export const LANGUAGES = [
  { code: 'en', label: 'English', en: 'English' },
  { code: 'id', label: 'Indonesia', en: 'Indonesian' },
  { code: 'zh', label: '中文', en: 'Chinese' },
  { code: 'ru', label: 'Русский', en: 'Russian' },
  { code: 'ja', label: '日本語', en: 'Japanese' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

// English ships inside the main bundle; other locales are split into lazy chunks.
const loaders = import.meta.glob<{ default: Record<string, unknown> }>([
  './locales/*.json',
  '!./locales/en.json',
]);

i18n
  .use(LanguageDetector)
  .use(
    resourcesToBackend((lng: string, _ns: string, cb: (err: any, res?: any) => void) => {
      const load = loaders[`./locales/${lng}.json`];
      if (!load) return cb(new Error(`No locale bundle for "${lng}"`));
      load().then((m) => cb(null, m.default)).catch(cb);
    }),
  )
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    fallbackLng: 'en',
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    partialBundledLanguages: true,
    react: { useSuspense: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

const applyMeta = () => {
  document.documentElement.lang = i18n.language;
  document.title = i18n.t('app.title');
};
i18n.on('languageChanged', applyMeta);
i18n.on('initialized', applyMeta);

export default i18n;
