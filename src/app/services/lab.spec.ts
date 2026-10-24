import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { SpecAdapter } from '../adapters/spec.adapter';
import { GetSpecRequest, GetSpecsRequest } from '../core/api/spec.requests';
import { ApiService } from '../core/services/api.service';
import { Spec } from '../models';
import { LabService } from './lab';

const mockSpec = (overrides?: Partial<Spec>): Spec =>
  ({
    id: 'spec1',
    producerId: 'p1',
    producerName: 'Producer',
    type: 'beat',
    category: 'beat',
    imageUrl: 'img.jpg',
    title: 'Test Beat',
    bpm: 120,
    key: 'C Major',
    tags: [],
    price: 100,
    genres: [],
    licenses: [],
    ...overrides,
  }) as Spec;

describe('LabService', () => {
  it('getSpecs maps data and stores pagination metadata', () => {
    const execute = vi.fn().mockReturnValue(
      of({
        data: [{ id: 'dto1' }],
        metadata: { page: 1, total: 1, per_page: 20 },
      }),
    );
    const adapt = vi.fn().mockReturnValue(mockSpec({ id: 'spec1' }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs({ page: 1 }).subscribe((specs) => {
      expect(specs).toEqual([mockSpec({ id: 'spec1' })]);
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecsRequest);
    expect(service.specsPagination()).toEqual({ page: 1, total: 1, per_page: 20 });
    expect(adapt).toHaveBeenCalledWith({ id: 'dto1' });
  });

  it('getSpecs handles flat array response', () => {
    const execute = vi.fn().mockReturnValue(of([{ id: 'dto1' }, { id: 'dto2' }]));
    const adapt = vi.fn((dto) => mockSpec({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs().subscribe((specs) => {
      expect(specs).toEqual([mockSpec({ id: 'dto1' }), mockSpec({ id: 'dto2' })]);
    });
    expect(service.specsPagination()).toBeNull();
  });

  it('restores pagination metadata when a cached query is revisited', () => {
    const execute = vi.fn((request: GetSpecsRequest) => {
      const search = request.params.get('search');
      return of({
        data: [{ id: `${search}-dto` }],
        metadata:
          search === 'explore'
            ? { page: 1, total: 42, per_page: 10, total_pages: 5 }
            : { page: 1, total: 4, per_page: 4, total_pages: 1 },
      });
    });
    const adapt = vi.fn((dto) => mockSpec({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecs({ search: 'explore', page: 1, per_page: 10 }).subscribe();
    expect(service.specsPagination()?.total_pages).toBe(5);

    service.getSpecs({ search: 'other', page: 1, per_page: 4 }).subscribe();
    expect(service.specsPagination()?.total_pages).toBe(1);

    service.getSpecs({ search: 'explore', page: 1, per_page: 10 }).subscribe();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(service.specsPagination()).toEqual({
      page: 1,
      total: 42,
      per_page: 10,
      total_pages: 5,
    });
  });

  function setup(execute: any) {
    const adapt = vi.fn((dto) => mockSpec({ id: dto?.id ?? 'x' }));
    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    return { service: TestBed.inject(LabService), adapt };
  }

  it('getSpecs handles empty/odd responses, caches by sorted key and refreshes', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service } = setup(execute);
    let result: Spec[] | undefined;
    service.getSpecs().subscribe((s) => (result = s));
    expect(result).toEqual([]);
    expect(service.specsPagination()).toBeNull();

    service.getSpecs({ page: 1, search: 'a' }).subscribe();
    service.getSpecs({ search: 'a', page: 1 }).subscribe();
    service.getSpecs().subscribe();
    expect(execute).toHaveBeenCalledTimes(2);

    const refreshed = vi.fn();
    service.refresh$.subscribe(refreshed);
    service.notifyRefresh();
    expect(refreshed).toHaveBeenCalled();
    service.getSpecs().subscribe();
    expect(execute).toHaveBeenCalledTimes(3);

    execute.mockReturnValueOnce(of(null));
    service.getSpecs({ page: 9 }).subscribe((s) => expect(s).toEqual([]));
  });

  it('getHome adapts homepage dto with defaults', () => {
    const dto = {
      generated_at: 'now',
      cache_ttl_seconds: 60,
      stats: { total_live_beats: 5, new_releases_7d: 2, total_producers: 3 },
      sections: {
        hot: {
          title: 'Hot',
          source: 'query',
          period: '7d',
          items: [
            {
              rank: 1,
              score: 9,
              movement: 'up',
              metrics: {
                plays: 1,
                unique_listeners: 2,
                favorites: 3,
                downloads: 4,
                purchases: 5,
                revenue: 6,
              },
              spec: { id: 'a' },
            },
            { rank: 2, score: 1, movement: '-', spec: { id: 'b' } },
          ],
        },
        empty: { title: 'Empty', source: 'fallback' },
      },
    };
    const execute = vi.fn().mockReturnValue(of(dto));
    const { service } = setup(execute);
    let data: any;
    service.getHome({ limit: 2 }).subscribe((d) => (data = d));
    expect(data.generatedAt).toBe('now');
    expect(data.cacheTtlSeconds).toBe(60);
    expect(data.stats).toEqual({ totalLiveBeats: 5, newReleases7d: 2, totalProducers: 3 });
    expect(data.sections['hot'].items[0].metrics).toEqual({
      plays: 1,
      uniqueListeners: 2,
      favorites: 3,
      downloads: 4,
      purchases: 5,
      revenue: 6,
    });
    expect(data.sections['hot'].items[1].metrics).toEqual({
      plays: 0,
      uniqueListeners: undefined,
      favorites: 0,
      downloads: 0,
      purchases: 0,
      revenue: 0,
    });
    expect(data.sections['empty'].items).toEqual([]);

    execute.mockReturnValue(of({ generated_at: 'x', cache_ttl_seconds: 1 }));
    service.getHome().subscribe((d) => (data = d));
    expect(data.sections).toEqual({});
    expect(data.stats).toEqual({ totalLiveBeats: 0, newReleases7d: 0, totalProducers: 0 });
  });

  it('getSpecById keeps ids without # prefix', () => {
    const execute = vi.fn().mockReturnValue(of({ id: 'd' }));
    const { service } = setup(execute);
    service.getSpecById('plain').subscribe();
    expect((execute.mock.calls[0][0] as GetSpecRequest).path).toBe('/specs/plain');
  });

  it('getSpecById strips the optional # prefix', () => {
    const execute = vi.fn().mockReturnValueOnce(of({ id: 'dto1' }));

    const adapt = vi.fn((dto) => mockSpec({ id: dto.id }));

    TestBed.configureTestingModule({
      providers: [
        LabService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adapt } },
      ],
    });
    const service = TestBed.inject(LabService);

    service.getSpecById('#abc').subscribe((spec) => expect(spec).toEqual(mockSpec({ id: 'dto1' })));

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetSpecRequest);
    expect((execute.mock.calls[0][0] as GetSpecRequest).path).toBe('/specs/abc');
  });
});
