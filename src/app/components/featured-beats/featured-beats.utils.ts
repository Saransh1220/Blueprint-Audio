import type { Spec } from '../../models';
import { type CurrencyDefinition, FALLBACK_CURRENCIES, formatMoneyValue } from '../../models/money';
import type { DiscItem } from '../disc-carousel/disc-carousel';

export function formatPlays(spec: Spec): string {
  const plays = spec.analytics?.playCount ?? 0;
  if (plays >= 1_000_000) return `${(plays / 1_000_000).toFixed(plays >= 10_000_000 ? 0 : 1)}M`;
  if (plays >= 1_000) return `${Math.round(plays / 1_000)}K`;
  return String(plays);
}

export function startingPrice(
  spec: Spec,
  currencies: readonly CurrencyDefinition[] = FALLBACK_CURRENCIES,
): string {
  const fallbackCurrency = spec.displayPriceMoney?.currency || spec.priceMoney?.currency || 'USD';
  return formatMoneyValue(
    spec.displayPriceMoney ?? spec.priceMoney,
    spec.price ?? 0,
    fallbackCurrency,
    currencies,
  );
}

/** A beat as a disc: cover art as the label, its metadata as the credits, its numbers as the stats. */
export function specToDisc(
  spec: Spec,
  currencies: readonly CurrencyDefinition[] = FALLBACK_CURRENCIES,
): DiscItem {
  return {
    id: spec.id,
    title: spec.title,
    imageUrl: spec.imageUrl || undefined,
    alt: `${spec.title} by ${spec.producerName}`,
    credits: [
      { label: 'Producer', value: spec.producerName },
      { label: 'Genre', value: spec.genres?.[0]?.name || 'Beat' },
      { label: 'BPM', value: String(spec.bpm) },
      { label: 'Key', value: String(spec.key) },
    ],
    stats: [
      { label: 'Plays', value: formatPlays(spec) },
      { label: 'From', value: startingPrice(spec, currencies) },
    ],
  };
}
