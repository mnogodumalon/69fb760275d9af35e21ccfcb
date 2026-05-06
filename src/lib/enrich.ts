import type { EnrichedBestellungen } from '@/types/enriched';
import type { Bestellungen, LaptopKatalog } from '@/types/app';
import { extractRecordId } from '@/services/livingAppsService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveDisplay(url: unknown, map: Map<string, any>, ...fields: string[]): string {
  if (!url) return '';
  const id = extractRecordId(url);
  if (!id) return '';
  const r = map.get(id);
  if (!r) return '';
  return fields.map(f => String(r.fields[f] ?? '')).join(' ').trim();
}

interface BestellungenMaps {
  laptopKatalogMap: Map<string, LaptopKatalog>;
}

export function enrichBestellungen(
  bestellungen: Bestellungen[],
  maps: BestellungenMaps
): EnrichedBestellungen[] {
  return bestellungen.map(r => ({
    ...r,
    laptop_refName: resolveDisplay(r.fields.laptop_ref, maps.laptopKatalogMap, 'hersteller_name'),
  }));
}
