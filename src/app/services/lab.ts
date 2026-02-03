import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { GetSpecRequest, GetSpecsRequest, type SpecDto } from '../core/api/spec.requests';
import { type Spec } from '../models';
import { SpecAdapter } from '../adapters/spec.adapter';

@Injectable({
  providedIn: 'root',
})
export class LabService {
  private api = inject(ApiService);
  private adapter = inject(SpecAdapter);

  getSpecs(filters?: { category?: 'beat' | 'sample'; genres?: string[] }): Observable<Spec[]> {
    return this.api
      .execute(new GetSpecsRequest(filters))
      .pipe(map((dtos) => dtos.map((dto) => this.adapter.adapt(dto))));
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
}
