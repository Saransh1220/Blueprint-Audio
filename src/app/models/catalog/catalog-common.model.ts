import type { Money } from '../money';

export type CatalogId = string;
export type CatalogViewMode = 'grid' | 'list';
export type CatalogPriceMode = 'all' | 'free' | 'paid';
export type CatalogArtworkPalette = 'hot' | 'cobalt' | 'lime' | 'lavender' | 'sun' | 'midnight';
export type CatalogAudioFormat = 'wav' | 'midi' | 'stems' | 'presets';

export type CatalogGenre = 'trap' | 'lofi' | 'rnb' | 'drill' | 'house' | 'boombap' | 'synthwave';

export interface CatalogProducerSummary {
  readonly id: CatalogId;
  readonly handle: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly avatarFallback: string;
  readonly isVerified: boolean;
}

export interface CatalogArtwork {
  readonly imageUrl: string | null;
  readonly alt: string;
  readonly palette: CatalogArtworkPalette;
}

export interface CatalogEngagement {
  readonly playCount: number;
  readonly downloadCount: number;
  readonly wishlistCount?: number;
}

export interface CatalogListEntity {
  readonly id: CatalogId;
  readonly slug: string;
  readonly title: string;
  readonly titleAccent: string;
  readonly producer: CatalogProducerSummary;
  readonly genre: CatalogGenre;
  readonly moods: readonly string[];
  readonly formats: readonly CatalogAudioFormat[];
  readonly price: Money;
  readonly artwork: CatalogArtwork;
  readonly engagement: CatalogEngagement;
  readonly publishedAt: string;
}

export interface CatalogPagination {
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
}

export interface CatalogPage<T> {
  readonly items: readonly T[];
  readonly pagination: CatalogPagination;
}
