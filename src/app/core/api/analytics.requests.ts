import { ApiRequest, HttpMethod } from '../api/api-request';
import type { ProducerAnalyticsDto } from '../api/spec.requests';

// Track a play event for a spec
export class TrackPlayRequest implements ApiRequest<void> {
  readonly path: string;
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: void;

  constructor(specId: string) {
    this.path = `/specs/${specId}/play`;
  }
}

// Toggle favorite status for a spec
export interface ToggleFavoriteResponse {
  favorited: boolean;
  total_count: number;
}

export class ToggleFavoriteRequest implements ApiRequest<ToggleFavoriteResponse> {
  readonly path: string;
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: ToggleFavoriteResponse;

  constructor(specId: string) {
    this.path = `/specs/${specId}/favorite`;
  }
}

// Get producer analytics for a spec (owner only)
export class GetProducerAnalyticsRequest implements ApiRequest<ProducerAnalyticsDto> {
  readonly path: string;
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: ProducerAnalyticsDto;

  constructor(specId: string) {
    this.path = `/specs/${specId}/analytics`;
  }
}

// Download free MP3
export interface DownloadFreeMp3Response {
  download_url: string;
  message: string;
}

export class DownloadFreeMp3Request implements ApiRequest<DownloadFreeMp3Response> {
  readonly path: string;
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: DownloadFreeMp3Response;

  constructor(specId: string) {
    this.path = `/specs/${specId}/download-free`;
  }
}
// Analytics Overview
export interface DailyStat {
  date: string;
  count: number;
}

export interface TopSpecStat {
  spec_id: string;
  title: string;
  plays: number;
  downloads: number;
  revenue: number;
}

export interface DailyRevenueStat {
  date: string;
  revenue: number;
}

export interface AnalyticsOverviewResponse {
  total_plays: number;
  total_favorites: number;
  total_revenue: number;
  total_downloads: number;
  plays_by_day: DailyStat[];
  downloads_by_day: DailyStat[];
  revenue_by_day: DailyRevenueStat[];
  top_specs: TopSpecStat[];
  revenue_by_license: Record<string, number>;
}

import { HttpParams } from '@angular/common/http';

export class GetOverviewRequest implements ApiRequest<AnalyticsOverviewResponse> {
  readonly path = '/analytics/overview';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: AnalyticsOverviewResponse;
  readonly params: HttpParams;

  constructor(days: number = 30, sortBy: 'plays' | 'revenue' | 'downloads' = 'plays') {
    this.params = new HttpParams().set('days', days).set('sortBy', sortBy);
  }
}

export class GetTopSpecsRequest implements ApiRequest<TopSpecStat[]> {
  readonly path = '/analytics/top-specs';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: TopSpecStat[];
  readonly params: HttpParams;

  constructor(limit: number = 5, sortBy: 'plays' | 'revenue' | 'downloads' = 'plays') {
    this.params = new HttpParams().set('limit', limit).set('sortBy', sortBy);
  }
}
