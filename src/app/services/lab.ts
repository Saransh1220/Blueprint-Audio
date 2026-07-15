import { Injectable, inject, signal } from '@angular/core';
import { map, type Observable, Subject, shareReplay, tap } from 'rxjs';
import { SpecAdapter } from '../adapters/spec.adapter';
import {
  CreateSpecRequest,
  GetCatalogHomeRequest,
  GetSpecRequest,
  GetSpecsRequest,
  type HomepageDto,
  type HomepageItemDto,
  type SpecDto,
} from '../core/api/spec.requests';
import { ApiService } from '../core/services/api.service';
import { type Spec } from '../models';

import { PaginationMetadata } from '../models/payment';

export interface HomepageMetrics {
  plays: number;
  uniqueListeners?: number;
  favorites: number;
  downloads: number;
  purchases: number;
  revenue: number;
}

export interface HomepageItem {
  rank: number;
  score: number;
  movement: 'up' | 'down' | '-';
  metrics: HomepageMetrics;
  spec: Spec;
}

export interface HomepageSection {
  title: string;
  source: 'fallback' | 'query' | 'algorithmic' | 'curated';
  period?: '24h' | '7d' | '30d';
  items: HomepageItem[];
}

export interface HomepageData {
  generatedAt: string;
  cacheTtlSeconds: number;
  stats: {
    totalLiveBeats: number;
    newReleases7d: number;
    totalProducers: number;
  };
  sections: Record<string, HomepageSection>;
}

@Injectable({
  providedIn: 'root',
})
export class LabService {
  private api = inject(ApiService);
  private adapter = inject(SpecAdapter);

  private _refreshTrigger = new Subject<void>();
  refresh$ = this._refreshTrigger.asObservable();
  private specsCache = new Map<string, Observable<Spec[]>>();

  specsPagination = signal<PaginationMetadata | null>(null);

  notifyRefresh() {
    this.specsCache.clear();
    this._refreshTrigger.next();
  }

  getSpecs(filters?: {
    category?: 'beat' | 'sample';
    genres?: string[];
    search?: string;
    min_bpm?: number;
    max_bpm?: number;
    min_price?: number;
    max_price?: number;
    key?: string;
    page?: number;
    per_page?: number;
    sort?: string;
  }): Observable<Spec[]> {
    const cacheKey = this.specsCacheKey(filters);
    const cached = this.specsCache.get(cacheKey);
    if (cached) return cached;

    const request$ = this.api.execute(new GetSpecsRequest(filters)).pipe(
      tap((response: any) => {
        const metadata = response?.metadata || null;
        this.specsPagination.set(metadata);
      }),
      map((response: any) => {
        const data = response?.data || (Array.isArray(response) ? response : []);
        return data.map((dto: any) => this.adapter.adapt(dto));
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.specsCache.set(cacheKey, request$);
    return request$;
  }

  getHome(params?: {
    limit?: number;
    sections?: string[];
    period?: '24h' | '7d' | '30d';
  }): Observable<HomepageData> {
    return this.api.execute(new GetCatalogHomeRequest(params)).pipe(
      map((dto) => this.adaptHomepage(dto)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  private specsCacheKey(filters?: Record<string, unknown>): string {
    if (!filters) return 'all';
    return JSON.stringify(
      Object.keys(filters)
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = filters[key];
          return acc;
        }, {}),
    );
  }

  getSpecById(id: string): Observable<Spec | undefined> {
    // Strip '#' if present
    const cleanId = id.startsWith('#') ? id.substring(1) : id;

    // Check if it's a valid UUID (simple check or let backend handle 404)
    // The backend expects UUID. Our hardcoded IDs were #9092A.
    // If the ID is not a UUID, the backend will return error.
    // For now, we assume the app will use real UUIDs.

    return this.api
      .execute(new GetSpecRequest(cleanId))
      .pipe(map((dto) => this.adapter.adapt(dto)));
  }

  createSpec(formData: FormData): Observable<any> {
    return this.api.upload(new CreateSpecRequest(formData)).pipe(
      map((event) => {
        if (event.type === 4 && event.body) {
          // HttpEventType.Response === 4
          return event.clone({ body: this.adapter.adapt(event.body) });
        }
        return event;
      }),
    );
  }

  private adaptHomepage(dto: HomepageDto): HomepageData {
    const sections: Record<string, HomepageSection> = {};
    for (const [key, section] of Object.entries(dto.sections || {})) {
      sections[key] = {
        title: section.title,
        source: section.source,
        period: section.period,
        items: (section.items || []).map((item) => this.adaptHomepageItem(item)),
      };
    }

    return {
      generatedAt: dto.generated_at,
      cacheTtlSeconds: dto.cache_ttl_seconds,
      stats: {
        totalLiveBeats: dto.stats?.total_live_beats ?? 0,
        newReleases7d: dto.stats?.new_releases_7d ?? 0,
        totalProducers: dto.stats?.total_producers ?? 0,
      },
      sections,
    };
  }

  private adaptHomepageItem(dto: HomepageItemDto): HomepageItem {
    return {
      rank: dto.rank,
      score: dto.score,
      movement: dto.movement,
      metrics: {
        plays: dto.metrics?.plays ?? 0,
        uniqueListeners: dto.metrics?.unique_listeners,
        favorites: dto.metrics?.favorites ?? 0,
        downloads: dto.metrics?.downloads ?? 0,
        purchases: dto.metrics?.purchases ?? 0,
        revenue: dto.metrics?.revenue ?? 0,
      },
      spec: this.adapter.adapt(dto.spec),
    };
  }
}
