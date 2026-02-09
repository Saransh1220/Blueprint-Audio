import { HttpParams } from '@angular/common/http';
import { ApiRequest, HttpMethod } from './api-request';

export interface PublicAnalyticsDto {
  play_count: number;
  favorite_count: number;
  total_download_count: number;
  is_favorited?: boolean;
}

export interface ProducerAnalyticsDto {
  play_count: number;
  favorite_count: number;
  total_download_count: number;
  total_purchase_count: number;
  purchases_by_license: Record<string, number>;
  total_revenue: number;
}

export interface SpecDto {
  id: string;
  producer_id: string;
  title: string;
  category: 'beat' | 'sample';
  type: string;
  bpm: number;
  key: string; // The backend sends "C Minor" string, front expects Enum? We might need to parse.
  image_url: string;
  preview_url: string;
  wav_url?: string;
  stems_url?: string;
  price: number;
  duration?: number;
  free_mp3_enabled?: boolean;
  created_at: string;
  updated_at: string;
  tags?: string[];
  description?: string;
  genres?: GenreDto[];
  licenses?: LicenseDto[];
  analytics?: PublicAnalyticsDto;
}

export interface GenreDto {
  id: string;
  name: string;
  slug: string;
}

export interface LicenseDto {}

export interface LicenseDto {
  id: string;
  spec_id: string;
  type: string; // "Basic" etc
  name: string;
  price: number;
  features: string[];
  file_types: string[];
  created_at: string;
  updated_at: string;
}

import { PaginatedResponse } from '../../models/payment';

export class GetSpecsRequest implements ApiRequest<PaginatedResponse<SpecDto>> {
  readonly path = '/specs';
  readonly method: HttpMethod = 'GET';
  readonly params: HttpParams;
  readonly _responseType?: PaginatedResponse<SpecDto>;

  constructor(filters?: {
    category?: string;
    genres?: string[];
    tags?: string[];
    search?: string;
    min_bpm?: number;
    max_bpm?: number;
    min_price?: number;
    max_price?: number;
    key?: string;
    page?: number;
    sort?: string;
  }) {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.genres?.length) {
      const mappedGenres = filters.genres.map((g) => (g === 'R&B' ? 'RnB' : g));
      params = params.set('genres', mappedGenres.join(','));
    }
    if (filters?.tags?.length) params = params.set('tags', filters.tags.join(','));
    if (filters?.search) params = params.set('search', filters.search);
    if (filters?.min_bpm) params = params.set('min_bpm', filters.min_bpm);
    if (filters?.max_bpm) params = params.set('max_bpm', filters.max_bpm);
    if (filters?.min_price) params = params.set('min_price', filters.min_price);
    if (filters?.max_price) params = params.set('max_price', filters.max_price);
    if (filters?.key && filters.key !== 'All') params = params.set('key', filters.key);
    if (filters?.page) params = params.set('page', filters.page);
    if (filters?.sort) params = params.set('sort', filters.sort);
    this.params = params;
  }
}

export class GetSpecRequest implements ApiRequest<SpecDto> {
  readonly method: HttpMethod = 'GET';
  readonly path: string;
  readonly _responseType?: SpecDto;

  constructor(id: string) {
    this.path = `/specs/${id}`;
  }
}

export class CreateSpecRequest implements ApiRequest<SpecDto> {
  readonly path = '/specs';
  readonly method: HttpMethod = 'POST';
  readonly body: FormData;
  readonly _responseType?: SpecDto;

  constructor(body: FormData) {
    this.body = body;
  }
}

export interface SpecResponse extends SpecDto {}

export interface UpdateSpecDto {
  title?: string;
  category?: string;
  type?: string;
  bpm?: number;
  key?: string;
  base_price?: number;
  tags?: string[];
}

export class GetUserSpecsRequest implements ApiRequest<PaginatedResponse<SpecDto>> {
  readonly method: HttpMethod = 'GET';
  readonly path: string;
  readonly _responseType?: PaginatedResponse<SpecDto>;

  constructor(userId: string, page: number = 1) {
    this.path = `/users/${userId}/specs?page=${page}`;
  }
}

export class UpdateSpecRequest implements ApiRequest<SpecDto> {
  readonly method: HttpMethod = 'PATCH';
  readonly path: string;
  readonly body: UpdateSpecDto | FormData;
  readonly _responseType?: SpecDto;

  constructor(specId: string, body: UpdateSpecDto | FormData) {
    this.path = `/specs/${specId}`;
    this.body = body;
  }
}

export class DeleteSpecRequest implements ApiRequest<void> {
  readonly method: HttpMethod = 'DELETE';
  readonly path: string;
  readonly _responseType?: void;

  constructor(specId: string) {
    this.path = `/specs/${specId}`;
  }
}
