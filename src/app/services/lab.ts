import { Injectable, inject } from '@angular/core';
import { type Observable, map } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
  GetSpecRequest,
  GetSpecsRequest,
  type LicenseDto,
  type SpecDto,
} from '../core/api/spec.requests';
import { Genre, MusicalKey, type LicenseOption, type Spec } from '../models';

@Injectable({
  providedIn: 'root',
})
export class LabService {
  private api = inject(ApiService);

  getSpecs(filters?: { category?: 'beat' | 'sample'; genres?: string[] }): Observable<Spec[]> {
    return this.api
      .execute(new GetSpecsRequest(filters))
      .pipe(map((dtos) => dtos.map((dto) => this.mapDtoToModel(dto))));
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
      .pipe(map((dto) => this.mapDtoToModel(dto)));
  }

  private mapDtoToModel(dto: SpecDto): Spec {
    // Fix URLs for local development (minio -> localhost)
    const fixUrl = (url?: string) => {
      console.log('Mapping URL:', url); // Debug log
      return url ? url.replace('http://minio:9000', 'http://localhost:9000') : '';
    };

    return {
      id: dto.id,
      type: dto.type,
      category: dto.category,
      imageUrl: fixUrl(dto.image_url),
      title: dto.title,
      bpm: dto.bpm,
      // Map "C Minor" -> "C MINOR" (simple uppercase to match Enum values roughly)
      // Ideally we should have a robust mapper if the enum values diverge more.
      key: dto.key.toUpperCase() as MusicalKey,
      tags: dto.tags || [],
      price: dto.price,
      audioUrl: fixUrl(dto.preview_url), // Mapping preview_url to audioUrl for playback
      genres: dto.genres ? dto.genres : [],
      licenses: dto.licenses ? dto.licenses.map((l) => this.mapLicenseDto(l)) : [],
    };
  }

  private mapLicenseDto(dto: LicenseDto): LicenseOption {
    return {
      type: dto.type as any, // Cast to LicenseType unions
      name: dto.name,
      price: dto.price,
      features: dto.features,
      fileTypes: dto.file_types,
    };
  }
}
