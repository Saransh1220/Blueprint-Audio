import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ApiService } from '../core/services/api.service';
import {
  TrackPlayRequest,
  ToggleFavoriteRequest,
  ToggleFavoriteResponse,
  GetProducerAnalyticsRequest,
  DownloadFreeMp3Request,
  DownloadFreeMp3Response,
  GetOverviewRequest,
  AnalyticsOverviewResponse,
  GetTopSpecsRequest,
  TopSpecStat,
} from '../core/api/analytics.requests';
import { ProducerAnalytics } from '../models/spec';
import { SpecAdapter } from '../adapters/spec.adapter';

export interface FavoriteChangeEvent {
  specId: string;
  isFavorited: boolean;
  totalCount?: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = inject(ApiService);
  private adapter = inject(SpecAdapter);

  private favoriteChangeSubject = new Subject<FavoriteChangeEvent>();
  favoriteChanges$ = this.favoriteChangeSubject.asObservable();

  /**
   * Track a play event for a spec
   */
  trackPlay(specId: string): Observable<void> {
    return this.api.execute(new TrackPlayRequest(specId));
  }

  /**
   * Toggle favorite status for a spec
   * Returns whether the spec is now favorited and the new total count
   */
  toggleFavorite(specId: string): Observable<ToggleFavoriteResponse> {
    return this.api.execute(new ToggleFavoriteRequest(specId)).pipe(
      tap((response) => {
        this.favoriteChangeSubject.next({
          specId,
          isFavorited: response.is_favorited,
          totalCount: response.total_count,
        });
      }),
    );
  }

  /**
   * Get producer analytics for a spec (owner only)
   * Transforms DTO to frontend model
   */
  getProducerAnalytics(specId: string): Observable<ProducerAnalytics> {
    return this.api
      .execute(new GetProducerAnalyticsRequest(specId))
      .pipe(map((dto) => this.adapter.adaptProducerAnalytics(dto)));
  }

  /**
   * Download free MP3 for a spec
   * Returns the download URL and a message
   */
  downloadFreeMp3(specId: string): Observable<DownloadFreeMp3Response> {
    return this.api.execute(new DownloadFreeMp3Request(specId));
  }

  /**
   * Get aggregated analytics overview for the dashboard
   */
  getOverview(
    days: number = 30,
    sortBy: 'plays' | 'revenue' | 'downloads' = 'plays',
  ): Observable<AnalyticsOverviewResponse> {
    return this.api.execute(new GetOverviewRequest(days, sortBy));
  }

  /**
   * Get top performing specs (isolated for sorting)
   */
  getTopSpecs(
    limit: number = 5,
    sortBy: 'plays' | 'revenue' | 'downloads' = 'plays',
  ): Observable<TopSpecStat[]> {
    return this.api.execute(new GetTopSpecsRequest(limit, sortBy));
  }
}
