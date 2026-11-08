import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { SpecAdapter } from '../adapters/spec.adapter';
import {
  DownloadFreeMp3Request,
  GetOverviewRequest,
  GetProducerAnalyticsRequest,
  GetTopSpecsRequest,
  ToggleFavoriteRequest,
  type ToggleFavoriteResponse,
  TrackPlayRequest,
} from '../core/api/analytics.requests';
import { ApiService } from '../core/services/api.service';
import type { Spec } from '../models';
import { AnalyticsService } from './analytics.service';
import { FavoriteStateService } from './favorite-state.service';

describe('AnalyticsService', () => {
  it('sends expected request classes and maps producer analytics dto', () => {
    const execute = vi.fn((req: unknown) => {
      if (req instanceof GetProducerAnalyticsRequest) {
        return of({
          play_count: 10,
          favorite_count: 3,
          total_download_count: 1,
          total_purchase_count: 2,
          purchases_by_license: { Basic: 2 },
          total_revenue: 60,
        });
      }
      if (req instanceof GetTopSpecsRequest) {
        return of([{ spec_id: 's1', title: 'A', plays: 1, downloads: 2, revenue: 3 }]);
      }
      return of({ ok: true });
    });
    const adaptProducerAnalytics = vi.fn().mockReturnValue({ playCount: 10 });

    TestBed.configureTestingModule({
      providers: [
        AnalyticsService,
        { provide: ApiService, useValue: { execute } },
        { provide: SpecAdapter, useValue: { adaptProducerAnalytics } },
      ],
    });

    const service = TestBed.inject(AnalyticsService);

    service.trackPlay('s1').subscribe();
    service.toggleFavorite('s1').subscribe();
    service.downloadFreeMp3('s1').subscribe();
    service.getOverview(14, 'downloads').subscribe();
    service.getTopSpecs(5, 'revenue').subscribe();
    service.getProducerAnalytics('s1').subscribe((result) => {
      expect(result).toEqual({ playCount: 10 });
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(TrackPlayRequest);
    expect(execute.mock.calls[1][0]).toBeInstanceOf(ToggleFavoriteRequest);
    expect(execute.mock.calls[2][0]).toBeInstanceOf(DownloadFreeMp3Request);
    expect(execute.mock.calls[3][0]).toBeInstanceOf(GetOverviewRequest);
    expect((execute.mock.calls[3][0] as GetOverviewRequest).params.get('days')).toBe('14');
    expect((execute.mock.calls[3][0] as GetOverviewRequest).params.get('sortBy')).toBe('downloads');
    expect(execute.mock.calls[4][0]).toBeInstanceOf(GetTopSpecsRequest);
    expect((execute.mock.calls[4][0] as GetTopSpecsRequest).params.get('limit')).toBe('5');
    expect((execute.mock.calls[4][0] as GetTopSpecsRequest).params.get('sortBy')).toBe('revenue');
    expect(execute.mock.calls[5][0]).toBeInstanceOf(GetProducerAnalyticsRequest);
    expect(adaptProducerAnalytics).toHaveBeenCalledTimes(1);
  });

  it('shares confirmed favorites across beat copies and ignores overlapping toggles', () => {
    const response = new Subject<ToggleFavoriteResponse>();
    const execute = vi.fn(() => response);
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: { execute } }],
    });
    const analytics = TestBed.inject(AnalyticsService);
    const favorites = TestBed.inject(FavoriteStateService);
    favorites.setViewer('buyer');
    const beat = { id: 's1', analytics: { isFavorited: false } } as Spec;
    const playerTrack = { ...beat, analytics: { ...beat.analytics! } };

    expect(favorites.isFavorited(beat)).toBe(false);
    analytics.toggleFavorite(beat.id).subscribe();
    analytics.toggleFavorite(playerTrack.id).subscribe();
    expect(execute).toHaveBeenCalledTimes(1);

    response.next({ is_favorited: true });
    response.complete();
    expect(favorites.isFavorited(beat)).toBe(true);
    expect(favorites.isFavorited(playerTrack)).toBe(true);

    favorites.setViewer('another-buyer');
    expect(favorites.isFavorited(beat)).toBe(false);
    analytics.toggleFavorite(beat.id).subscribe();
    expect(execute).toHaveBeenCalledTimes(2);
  });

  describe('reporting currency', () => {
    function make(report: unknown) {
      const execute = vi.fn(() => of(report));
      TestBed.configureTestingModule({
        providers: [
          AnalyticsService,
          { provide: ApiService, useValue: { execute } },
          { provide: SpecAdapter, useValue: {} },
        ],
      });
      return { service: TestBed.inject(AnalyticsService), execute };
    }

    beforeEach(() => TestBed.resetTestingModule());

    it('asks for the currency and accepts a confirmed report', () => {
      const { service, execute } = make({ revenue_currency: 'USD' });
      const next = vi.fn();
      service.getOverview(7, 'plays', 'USD').subscribe(next);
      expect((execute.mock.calls[0] as unknown[])[0]).toBeInstanceOf(GetOverviewRequest);
      expect(
        ((execute.mock.calls[0] as unknown[])[0] as GetOverviewRequest).params.get('currency'),
      ).toBe('USD');
      expect(next).toHaveBeenCalled();
    });

    it('rejects a report the API did not confirm in that currency', () => {
      const { service } = make({ revenue_currency: 'INR' });
      const error = vi.fn();
      service.getOverview(7, 'plays', 'USD').subscribe({ error });
      expect(error).toHaveBeenCalled();
    });

    it('does not require confirmation when no currency is requested', () => {
      const { service } = make({});
      const next = vi.fn();
      service.getOverview(7).subscribe(next);
      expect(next).toHaveBeenCalled();
    });
  });
});
