import { Injectable } from '@angular/core';
import { SpecDto, LicenseDto } from '../core/api/spec.requests';
import { Spec, LicenseOption, MusicalKey, LicenseType } from '../models';

@Injectable({
  providedIn: 'root',
})
export class SpecAdapter {
  adapt(dto: SpecDto): Spec {
    return {
      id: dto.id,
      type: dto.type,
      category: dto.category,
      imageUrl: dto.image_url,
      title: dto.title,
      bpm: dto.bpm,
      // Map "C Minor" -> "C MINOR" (simple uppercase to match Enum values roughly)
      key: dto.key.toUpperCase() as MusicalKey,
      tags: dto.tags || [],
      price: dto.price,
      audioUrl: dto.preview_url, // Mapping preview_url to audioUrl for playback
      genres: dto.genres ? dto.genres : [],
      licenses: dto.licenses ? dto.licenses.map((l) => this.mapLicenseDto(l)) : [],
    };
  }

  private mapLicenseDto(dto: LicenseDto): LicenseOption {
    return {
      type: dto.type as LicenseType,
      name: dto.name,
      price: dto.price,
      features: dto.features,
      fileTypes: dto.file_types,
    };
  }
}
