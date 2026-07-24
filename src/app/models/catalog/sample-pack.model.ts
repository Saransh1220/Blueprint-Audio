import type { CatalogId, CatalogListEntity, CatalogProducerSummary } from './catalog-common.model';

export type SamplePackType = 'drumkit' | 'melody' | 'fullkit' | 'vocal' | 'oneshot';
export type SampleFileType = 'full-loop' | 'melody' | 'bass' | 'drums' | 'vocal' | 'fx';

export interface SamplePackCatalogItem extends CatalogListEntity {
  readonly kind: 'sample-pack';
  readonly packType: SamplePackType;
  readonly fileCount: number;
  readonly totalSizeBytes: number;
}

export interface SampleFile {
  readonly id: CatalogId;
  readonly packId: CatalogId;
  readonly name: string;
  readonly nameAccent: string;
  readonly fileType: SampleFileType;
  readonly bpm: number | null;
  readonly musicalKey: string | null;
  readonly durationSeconds: number;
  readonly previewUrl: string | null;
  readonly waveformPeaks: readonly number[];
}

export interface SamplePackLicense {
  readonly name: string;
  readonly royaltyFree: boolean;
  readonly instantDownload: boolean;
  readonly unlimitedProjects: boolean;
  readonly termsUrl: string | null;
}

export interface CatalogRatingSummary {
  readonly average: number;
  readonly totalRatings: number;
  readonly distribution: Readonly<Record<1 | 2 | 3 | 4 | 5, number>>;
}

export interface CatalogReview {
  readonly id: CatalogId;
  readonly authorName: string;
  readonly authorAvatarUrl: string | null;
  readonly authorAvatarFallback: string;
  readonly rating: 1 | 2 | 3 | 4 | 5;
  readonly body: string;
  readonly createdAt: string;
}

export interface SamplePackProducerProfile extends CatalogProducerSummary {
  readonly bio: string;
  readonly packCount: number;
  readonly followerCount: number;
  readonly lifetimeSales: number;
}

export interface SamplePackDetail extends SamplePackCatalogItem {
  readonly description: string;
  readonly bpmRange: readonly [number, number];
  readonly demoUrl: string | null;
  readonly license: SamplePackLicense;
  readonly files: readonly SampleFile[];
  readonly producerProfile: SamplePackProducerProfile;
  readonly rating: CatalogRatingSummary;
  readonly reviews: readonly CatalogReview[];
  readonly relatedPacks: readonly SamplePackCatalogItem[];
}

export const SAMPLE_PACK_TYPE_LABELS: Readonly<Record<SamplePackType, string>> = {
  drumkit: 'Drum kit',
  melody: 'Melody pack',
  fullkit: 'Full song kit',
  vocal: 'Vocal pack',
  oneshot: 'One-shot bundle',
};

export const SAMPLE_FILE_TYPE_LABELS: Readonly<Record<SampleFileType, string>> = {
  'full-loop': 'Full loop',
  melody: 'Melody',
  bass: 'Bass',
  drums: 'Drums',
  vocal: 'Vocal chop',
  fx: 'FX',
};
