import { Injectable, inject, signal } from '@angular/core';
import { type Observable, map, tap } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
  GetSpecRequest,
  GetSpecsRequest,
  CreateSpecRequest,
  type SpecDto,
} from '../core/api/spec.requests';
import { type Spec } from '../models';
import { SpecAdapter } from '../adapters/spec.adapter';

import { PaginationMetadata } from '../models/payment';

@Injectable({
  providedIn: 'root',
})
export class LabService {
  private api = inject(ApiService);
  private adapter = inject(SpecAdapter);

  specsPagination = signal<PaginationMetadata | null>(null);

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
    sort?: string;
  }): Observable<Spec[]> {
    return this.api.execute(new GetSpecsRequest(filters)).pipe(
      tap((response: any) => {
        const metadata = response?.metadata || null;
        this.specsPagination.set(metadata);
      }),
      map((response: any) => {
        const data = response?.data || (Array.isArray(response) ? response : []);
        return data.map((dto: any) => this.adapter.adapt(dto));
      }),
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
}
