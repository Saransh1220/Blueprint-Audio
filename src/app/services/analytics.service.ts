import { Injectable, inject } from '@angular/core';
import { defer, EMPTY, finalize, Observable, Subject } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { SpecAdapter } from '../adapters/spec.adapter';
import {
  AnalyticsOverviewResponse,
  DownloadFreeMp3Request,
  DownloadFreeMp3Response,
  GetOverviewRequest,
  GetProducerAnalyticsRequest,
  GetTopSpecsRequest,
  ToggleFavoriteRequest,
  ToggleFavoriteResponse,
  TopSpecStat,
  TrackPlayRequest,
} from '../core/api/analytics.requests';
import { ApiService } from '../core/services/api.service';
import { ProducerAnalytics } from '../models/spec';
import { FavoriteStateService } from './favorite-state.service';

export interface FavoriteChangeEvent {
  specId: string;
  isFavorited: boolean;
  totalCount?: number;
}

@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private api = inject(ApiService);
  private adapter = inject(SpecAdapter);
  private favorites = inject(FavoriteStateService);
  private pendingFavorites = new Set<string>();

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
    return defer(() => {
      if (this.pendingFavorites.has(specId)) return EMPTY;
      this.pendingFavorites.add(specId);
      const record = this.favorites.recordChanges();

      return this.api.execute(new ToggleFavoriteRequest(specId)).pipe(
        filter((response) => record(specId, response.is_favorited)),
        tap((response) => {
          this.favoriteChangeSubject.next({
            specId,
            isFavorited: response.is_favorited,
            totalCount: response.total_count,
          });
        }),
        finalize(() => this.pendingFavorites.delete(specId)),
      );
    });
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
    currency?: string,
  ): Observable<AnalyticsOverviewResponse> {
    return this.api.execute(new GetOverviewRequest(days, sortBy, currency)).pipe(
      map((report) => {
        // Never show amounts under a currency label the API did not confirm.
        if (currency && report.revenue_currency !== currency) {
          throw new Error('The API did not confirm the reporting currency.');
        }
        return report;
      }),
    );
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
