import type { Money } from '../models/money';

export interface AccentTitleParts {
  readonly before: string;
  readonly accent: string;
  readonly after: string;
}

export function splitAccentTitle(title: string, accent: string): AccentTitleParts {
  const index = title.toLocaleLowerCase().indexOf(accent.toLocaleLowerCase());
  if (index < 0) return { before: title, accent: '', after: '' };
  return {
    before: title.slice(0, index),
    accent: title.slice(index, index + accent.length),
    after: title.slice(index + accent.length),
  };
}

export function formatCatalogPrice(price: Money): string {
  if (price.amount_minor === 0) return 'Free';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: price.currency,
    minimumFractionDigits: price.amount_minor % 100 === 0 ? 0 : 2,
  }).format(price.amount_minor / 100);
}

export function formatCatalogDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatCatalogFileSize(totalSizeBytes: number): string {
  if (totalSizeBytes < 1024 * 1024 * 1024) {
    return `${Math.round(totalSizeBytes / (1024 * 1024))} MB`;
  }
  return `${(totalSizeBytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
