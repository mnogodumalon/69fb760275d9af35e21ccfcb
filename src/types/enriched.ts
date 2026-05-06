import type { Bestellungen } from './app';

export type EnrichedBestellungen = Bestellungen & {
  laptop_refName: string;
};
