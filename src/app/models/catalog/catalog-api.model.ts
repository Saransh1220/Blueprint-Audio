import type { AppCurrency } from '../money';

export interface CatalogMoneyDto {
  readonly amount_minor: number;
  readonly currency: AppCurrency;
}

export interface CatalogProducerSummaryDto {
  readonly id: string;
  readonly handle: string;
  readonly display_name: string;
  readonly avatar_url: string | null;
  readonly is_verified: boolean;
}

export interface CatalogArtworkDto {
  readonly image_url: string | null;
  readonly alt: string;
  readonly palette: string;
}

export interface LoopCatalogItemDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly title_accent: string;
  readonly producer: CatalogProducerSummaryDto;
  readonly genre: string;
  readonly loop_type: string;
  readonly bpm: number;
  readonly musical_key: string | null;
  readonly moods: readonly string[];
  readonly formats: readonly string[];
  readonly duration_seconds: number;
  readonly price: CatalogMoneyDto;
  readonly artwork: CatalogArtworkDto;
  readonly preview_url: string | null;
  readonly waveform_peaks: readonly number[];
  readonly play_count: number;
  readonly download_count: number;
  readonly published_at: string;
}

export interface SamplePackCatalogItemDto {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly title_accent: string;
  readonly producer: CatalogProducerSummaryDto;
  readonly genre: string;
  readonly pack_type: string;
  readonly moods: readonly string[];
  readonly formats: readonly string[];
  readonly file_count: number;
  readonly total_size_bytes: number;
  readonly price: CatalogMoneyDto;
  readonly artwork: CatalogArtworkDto;
  readonly play_count: number;
  readonly download_count: number;
  readonly published_at: string;
}

export interface SampleFileDto {
  readonly id: string;
  readonly name: string;
  readonly name_accent: string;
  readonly file_type: string;
  readonly bpm: number | null;
  readonly musical_key: string | null;
  readonly duration_seconds: number;
  readonly preview_url: string | null;
  readonly waveform_peaks: readonly number[];
}

export interface CatalogReviewDto {
  readonly id: string;
  readonly author_name: string;
  readonly author_avatar_url: string | null;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly body: string;
  readonly created_at: string;
}

export interface SamplePackDetailDto extends SamplePackCatalogItemDto {
  readonly description: string;
  readonly bpm_min: number;
  readonly bpm_max: number;
  readonly demo_url: string | null;
  readonly license: {
    readonly name: string;
    readonly royalty_free: boolean;
    readonly instant_download: boolean;
    readonly unlimited_projects: boolean;
    readonly terms_url: string | null;
  };
  readonly files: readonly SampleFileDto[];
  readonly producer_profile: CatalogProducerSummaryDto & {
    readonly bio: string;
    readonly pack_count: number;
    readonly follower_count: number;
    readonly lifetime_sales: number;
  };
  readonly rating: {
    readonly average: number;
    readonly total_ratings: number;
    readonly distribution: Readonly<Record<'1' | '2' | '3' | '4' | '5', number>>;
  };
  readonly reviews: readonly CatalogReviewDto[];
  readonly related_packs: readonly SamplePackCatalogItemDto[];
}

export interface CatalogPaginationDto {
  readonly page: number;
  readonly per_page: number;
  readonly total: number;
  readonly total_pages: number;
}

export interface CatalogPageDto<T> {
  readonly data: readonly T[];
  readonly metadata: CatalogPaginationDto;
}
