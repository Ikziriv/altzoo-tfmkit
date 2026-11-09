import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { SPECIES, byId, type Species } from './species';

interface LocalizedSpeciesFields {
  name?: string;
  tags?: string[];
  description?: string;
  traits?: { label?: string; value?: string }[];
  habitat?: string;
  caption?: string;
  featured?: { headline?: string; text?: string };
  closeup?: { title?: string; text?: string };
}

/** Overlay the current locale's strings onto a species. Missing keys keep the English copy. */
export function localizeSpecies(s: Species): Species {
  const key = `species.${s.id}`;
  if (!i18n.exists(`${key}.name`)) return s;
  const tr = i18n.t(key, { returnObjects: true }) as LocalizedSpeciesFields;
  return {
    ...s,
    name: tr.name ?? s.name,
    tags: tr.tags ?? s.tags,
    description: tr.description ?? s.description,
    habitat: tr.habitat ?? s.habitat,
    caption: tr.caption ?? s.caption,
    featured: { ...s.featured, ...tr.featured },
    closeup: { ...s.closeup, ...tr.closeup },
    traits: s.traits.map((trait, i) => ({
      ...trait,
      label: tr.traits?.[i]?.label ?? trait.label,
      value: tr.traits?.[i]?.value ?? trait.value,
    })),
  };
}

export function useSpecies(id: string): Species {
  const { i18n: instance } = useTranslation();
  return useMemo(
    () => localizeSpecies(byId(id)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, instance.language],
  );
}

export function useSpeciesList(): Species[] {
  const { i18n: instance } = useTranslation();
  return useMemo(
    () => SPECIES.map(localizeSpecies),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [instance.language],
  );
}
