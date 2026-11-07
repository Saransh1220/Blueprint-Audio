import type { Spec } from '../../models';
import type { DiscItem } from '../disc-carousel/disc-carousel';

export function formatPlays(spec: Spec): string {
  const plays = spec.analytics?.playCount ?? 0;
  if (plays >= 1_000_000) return `${(plays / 1_000_000).toFixed(plays >= 10_000_000 ? 0 : 1)}M`;
  if (plays >= 1_000) return `${Math.round(plays / 1_000)}K`;
  return String(plays);
}

export function startingPrice(spec: Spec): string {
  const minor = spec.displayPriceMoney?.amount_minor;
  const amount = minor ? minor / 100 : (spec.price ?? 0);
  const currency = spec.displayPriceMoney?.currency || 'USD';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

/** A beat as a disc: cover art as the label, its metadata as the credits, its numbers as the stats. */
export function specToDisc(spec: Spec): DiscItem {
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
      { label: 'From', value: startingPrice(spec) },
    ],
  };
}
