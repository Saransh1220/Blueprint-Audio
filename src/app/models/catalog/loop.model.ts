import type { CatalogListEntity } from './catalog-common.model';

export type LoopType = 'melody' | 'drums' | 'bass' | 'fx' | 'vocal' | 'full';

export interface LoopCatalogItem extends CatalogListEntity {
  readonly kind: 'loop';
  readonly loopType: LoopType;
  readonly bpm: number;
  readonly musicalKey: string | null;
  readonly durationSeconds: number;
  readonly previewUrl: string | null;
  readonly waveformPeaks: readonly number[];
}

export const LOOP_TYPE_LABELS: Readonly<Record<LoopType, string>> = {
  melody: 'Melody',
  drums: 'Drums',
  bass: 'Bass',
  fx: 'FX',
  vocal: 'Vocal chop',
  full: 'Full loop',
};
