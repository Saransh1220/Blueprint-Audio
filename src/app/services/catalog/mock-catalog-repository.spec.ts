import { TestBed } from '@angular/core/testing';

import { MockCatalogRepository } from './mock-catalog-repository';

describe('MockCatalogRepository', () => {
  let service: MockCatalogRepository;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MockCatalogRepository);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('exposes lightweight catalog collections', () => {
    expect(service.listLoops()).toHaveLength(22);
    expect(service.listSamplePacks()).toHaveLength(18);
    expect(service.listSamplePacks()[0]).not.toHaveProperty('files');
  });

  it('loads the detail projection by slug', () => {
    const pack = service.getSamplePackDetail('violet-hour-essentials');
    expect(pack?.files).toHaveLength(15);
    expect(pack?.reviews).toHaveLength(3);
    expect(pack?.relatedPacks).toHaveLength(5);
  });

  it('returns null for an unknown pack', () => {
    expect(service.getSamplePackDetail('does-not-exist')).toBeNull();
  });
});
