import { HttpParams } from '@angular/common/http';
import { ApiRequest, HttpMethod } from './api-request';

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
  created_at: string;
  updated_at: string;
  tags?: string[];
  genres?: GenreDto[];
  licenses?: LicenseDto[];
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

  constructor(filters?: { category?: string; genres?: string[]; tags?: string[]; page?: number }) {
    let params = new HttpParams();
    if (filters?.category) params = params.set('category', filters.category);
    if (filters?.genres?.length) params = params.set('genres', filters.genres.join(','));
    if (filters?.tags?.length) params = params.set('tags', filters.tags.join(','));
    if (filters?.page) params = params.set('page', filters.page);
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
  readonly body: UpdateSpecDto;
  readonly _responseType?: SpecDto;

  constructor(specId: string, data: UpdateSpecDto) {
    this.path = `/specs/${specId}`;
    this.body = data;
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
