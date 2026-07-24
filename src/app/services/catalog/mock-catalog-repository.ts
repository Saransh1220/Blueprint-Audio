import { Injectable } from '@angular/core';
import {
  MOCK_LOOPS,
  MOCK_SAMPLE_PACK_DETAIL,
  MOCK_SAMPLE_PACKS,
} from '../../content/catalog/catalog.mock-data';
import type {
  LoopCatalogItem,
  SamplePackCatalogItem,
  SamplePackDetail,
} from '../../models/catalog';
import type { CatalogRepository } from './catalog-repository';

@Injectable({ providedIn: 'root' })
export class MockCatalogRepository implements CatalogRepository {
  listLoops(): readonly LoopCatalogItem[] {
    return MOCK_LOOPS;
  }

  listSamplePacks(): readonly SamplePackCatalogItem[] {
    return MOCK_SAMPLE_PACKS;
  }

  getSamplePackDetail(slug: string | null): SamplePackDetail | null {
    const summary = MOCK_SAMPLE_PACKS.find((candidate) => candidate.slug === slug);
    if (!summary && slug) return null;
    if (!summary) return MOCK_SAMPLE_PACK_DETAIL;
    return {
      ...MOCK_SAMPLE_PACK_DETAIL,
      ...summary,
      producerProfile: { ...MOCK_SAMPLE_PACK_DETAIL.producerProfile, ...summary.producer },
      relatedPacks: MOCK_SAMPLE_PACKS.filter((candidate) => candidate.id !== summary.id).slice(
        0,
        5,
      ),
    };
  }
}
