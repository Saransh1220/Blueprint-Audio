import { InjectionToken, inject } from '@angular/core';
import type {
  LoopCatalogItem,
  SamplePackCatalogItem,
  SamplePackDetail,
} from '../../models/catalog';
import { MockCatalogRepository } from './mock-catalog-repository';

/** UI-facing data port. An HTTP adapter can replace this provider without changing pages. */
export interface CatalogRepository {
  listLoops(): readonly LoopCatalogItem[];
  listSamplePacks(): readonly SamplePackCatalogItem[];
  getSamplePackDetail(slug: string | null): SamplePackDetail | null;
}

export const CATALOG_REPOSITORY = new InjectionToken<CatalogRepository>('CATALOG_REPOSITORY', {
  providedIn: 'root',
  factory: () => inject(MockCatalogRepository),
});
