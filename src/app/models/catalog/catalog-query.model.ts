import type { CatalogAudioFormat, CatalogGenre, CatalogPriceMode } from './catalog-common.model';
import type { LoopType } from './loop.model';
import type { SamplePackType } from './sample-pack.model';

export type CatalogSort = 'newest' | 'popular' | 'downloads';
export type LoopCatalogSort = CatalogSort | 'bpm-asc' | 'bpm-desc';

export interface CatalogPageQuery {
  readonly page: number;
  readonly pageSize: number;
  readonly search: string;
  readonly genres: readonly CatalogGenre[];
  readonly moods: readonly string[];
  readonly formats: readonly CatalogAudioFormat[];
  readonly priceMode: CatalogPriceMode;
}

export interface LoopCatalogQuery extends CatalogPageQuery {
  readonly loopTypes: readonly LoopType[];
  readonly bpmMin: number;
  readonly bpmMax: number;
  readonly musicalKey: string | null;
  readonly sort: LoopCatalogSort;
}

export interface SamplePackCatalogQuery extends CatalogPageQuery {
  readonly packTypes: readonly SamplePackType[];
  readonly fileCountMin: number;
  readonly fileCountMax: number;
  readonly sort: CatalogSort;
}
