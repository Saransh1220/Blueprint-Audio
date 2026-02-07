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
}

export interface AnalyticsOverviewDto {
    total_plays: number;
    total_favorites: number;
    total_revenue: number;
    total_downloads: number;
    plays_by_day: DailyStat[];
    top_specs: TopSpecStat[];
    revenue_by_license: { [key: string]: number };
}

import { HttpParams } from '@angular/common/http';

export class GetAnalyticsOverviewRequest implements ApiRequest<AnalyticsOverviewDto> {
    readonly path = '/analytics/overview';
    readonly method: HttpMethod = 'GET';
    readonly params: HttpParams;
    readonly _responseType?: AnalyticsOverviewDto;

    constructor(range: string = '30d') {
        this.params = new HttpParams().set('range', range);
    }
}
