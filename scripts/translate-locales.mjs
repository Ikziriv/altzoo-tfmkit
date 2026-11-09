// Machine-translate the English UI strings (en.json) and species copy
// (src/data/species.ts) into the other locales. Writes src/locales/<lang>.json.
// Re-run after editing English copy; existing translations are NOT cached,
// so review diffs before committing.
// Run: node scripts/translate-locales.mjs [lang …]  (default: all)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPECIES } from '../src/data/species.ts';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/locales/en.json'), 'utf8'));

// Google translate target codes + plural "N species" overrides per locale.
const TARGETS = {
  id: { tl: 'id', count: { count_other: '{{count}} spesies' } },
  zh: { tl: 'zh-CN', count: { count_other: '{{count}} 种' } },
  ru: {
    tl: 'ru',
    count: {
      count_one: '{{count}}  вид',
      count_few: '{{count}}  вида',
      count_many: '{{count}}  видов',
    },
  },
  ja: { tl: 'ja', count: { count_other: '{{count}} 種' } },
};

const argLangs = process.argv.slice(2);
const langs = argLangs.length ? argLangs : Object.keys(TARGETS);

// ---- collect translation jobs ------------------------------------------------

// Entries: { path: string[], text: string }
const uiJobs = [];
(function walk(node, trail) {
  for (const [k, v] of Object.entries(node)) {
    const p = [...trail, k];
    if (typeof v === 'string') uiJobs.push({ path: p, text: v });
    else if (v && typeof v === 'object') walk(v, p);
  }
})(en, []);

// Plural forms are generated per-locale, not machine translated.
const isPlural = (p) => /count_(one|other|few|many)$/.test(p[p.length - 1]);
// Keep the brand name in Latin script everywhere.
const skip = (p) => isPlural(p) || (p[0] === 'brand' && p[1] === 'name');

const speciesJobs = [];
for (const s of SPECIES) {
  const base = ['species', s.id];
  const put = (trail, text) => speciesJobs.push({ path: [...base, ...trail], text });
  put(['name'], s.name);
  s.tags.forEach((t, i) => put(['tags', String(i)], t));
  put(['description'], s.description);
  s.traits.forEach((t, i) => {
    put(['traits', String(i), 'label'], t.label);
    put(['traits', String(i), 'value'], t.value);
  });
  put(['habitat'], s.habitat);
  put(['caption'], s.caption);
  put(['featured', 'headline'], s.featured.headline);
  put(['featured', 'text'], s.featured.text);
  put(['closeup', 'title'], s.closeup.title);
  put(['closeup', 'text'], s.closeup.text);
}

// ---- translate ----------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cache = new Map();

async function gt(text, tl) {
  const key = tl + '' + text;
  if (cache.has(key)) return cache.get(key);
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&dt=t&tl=' +
    tl +
    '&q=' +
    encodeURIComponent(text);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      let out = j[0].map((seg) => seg[0]).join('');
      // Undo mangled i18next placeholders like "{{ count }}".
      out = out.replace(/\{\{\s*([A-Za-z_][\w]*)\s*\}\}/g, '{{$1}}');
      cache.set(key, out);
      return out;
    } catch (e) {
      if (attempt === 4) {
        console.error('  ! failed:', JSON.stringify(text.slice(0, 60)), e.message);
        return text;
      }
      await sleep(500 * (attempt + 1));
    }
  }
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (i < items.length) {
        const idx = i++;
        out[idx] = await fn(items[idx]);
      }
    }),
  );
  return out;
}

function setPath(obj, trail, value) {
  let cur = obj;
  for (let i = 0; i < trail.length - 1; i++) {
    const k = trail[i];
    const nextIsIndex = /^\d+$/.test(trail[i + 1]);
    if (!(k in cur)) cur[k] = nextIsIndex ? [] : {};
    cur = cur[k];
  }
  cur[trail[trail.length - 1]] = value;
}

// ---- run ----------------------------------------------------------------------

for (const lang of langs) {
  const { tl, count } = TARGETS[lang];
  const jobs = [...uiJobs.filter((j) => !skip(j.path)), ...speciesJobs];
  console.log(`translating ${jobs.length} strings → ${lang} (${tl})`);
  const done = { n: 0 };
  const translated = await mapLimit(jobs, 8, async (job) => {
    const out = await gt(job.text, tl);
    if (++done.n % 50 === 0) console.log(`  ${done.n}/${jobs.length}`);
    return out;
  });

  const bundle = {};
  // Untranslated scalar copies (brand name).
  for (const j of uiJobs) if (j.path[0] === 'brand' && j.path[1] === 'name') setPath(bundle, j.path, j.text);
  jobs.forEach((j, i) => setPath(bundle, j.path, translated[i]));
  for (const scope of ['nav', 'rail']) {
    for (const [k, v] of Object.entries(count)) setPath(bundle, [scope, k], v);
  }

  const file = path.join(ROOT, 'src/locales', `${lang}.json`);
  fs.writeFileSync(file, JSON.stringify(bundle, null, 2) + '\n', 'utf8');
  console.log(`wrote ${file}`);
}
console.log('done');
