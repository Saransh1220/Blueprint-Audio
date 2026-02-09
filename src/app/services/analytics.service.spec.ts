import { of } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import {
  DownloadFreeMp3Request,
  GetAnalyticsOverviewRequest,
  GetProducerAnalyticsRequest,
  ToggleFavoriteRequest,
  TrackPlayRequest,
} from '../core/api/analytics.requests';
import { ApiService } from '../core/services/api.service';
import { SpecAdapter } from '../adapters/spec.adapter';
import { AnalyticsService } from './analytics.service';

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
    service.getOverview(14).subscribe();
    service.getProducerAnalytics('s1').subscribe((result) => {
      expect(result).toEqual({ playCount: 10 });
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(TrackPlayRequest);
    expect(execute.mock.calls[1][0]).toBeInstanceOf(ToggleFavoriteRequest);
    expect(execute.mock.calls[2][0]).toBeInstanceOf(DownloadFreeMp3Request);
    expect(execute.mock.calls[3][0]).toBeInstanceOf(GetAnalyticsOverviewRequest);
    expect(execute.mock.calls[4][0]).toBeInstanceOf(GetProducerAnalyticsRequest);
    expect(adaptProducerAnalytics).toHaveBeenCalledTimes(1);
  });
});
