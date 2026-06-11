import { Injectable } from '@angular/core';
import {
  LicenseDto,
  ProducerAnalyticsDto,
  PublicAnalyticsDto,
  SpecDto,
} from '../core/api/spec.requests';
import {
  LicenseOption,
  LicenseType,
  MusicalKey,
  ProducerAnalytics,
  PublicAnalytics,
  Spec,
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class SpecAdapter {
  adapt(dto: SpecDto): Spec {
    return {
      id: dto.id,
      producerId: dto.producer_id,
      producerName: dto.producer_name,
      producerAvatarUrl:
        dto.producer_avatar_url || dto.producer_image_url || dto.producer_photo_url || undefined,
      type: dto.type,
      category: dto.category,
      imageUrl: dto.image_url,
      title: dto.title,
      bpm: dto.bpm,
      // Map "C Minor" -> "C MINOR" (simple uppercase to match Enum values roughly)
      key: dto.key.toUpperCase() as MusicalKey,
      tags: dto.tags || [],
      price: dto.price,
      priceMoney: dto.price_money,
      displayPriceMoney: dto.display_price_money,
      audioUrl: dto.preview_url, // Mapping preview_url to audioUrl for playback
      genres: dto.genres ? dto.genres : [],
      licenses: dto.licenses ? dto.licenses.map((l) => this.mapLicenseDto(l)) : [],
      duration: dto.duration,
      freeMp3Enabled: dto.free_mp3_enabled,
      analytics: dto.analytics ? this.adaptPublicAnalytics(dto.analytics) : undefined,
      processingStatus: dto.processing_status || 'completed', // Default to completed for old records
      shortCode: dto.short_code,
      slug: dto.slug,
      moods: dto.moods || [],
      instruments: dto.instruments || [],
    };
  }

  private mapLicenseDto(dto: LicenseDto): LicenseOption {
    return {
      id: dto.id,
      type: dto.type as LicenseType,
      name: dto.name,
      price: dto.price,
      priceMoney: dto.price_money,
      displayPriceMoney: dto.display_price_money,
      features: dto.features,
      fileTypes: dto.file_types,
    };
  }

  private adaptPublicAnalytics(dto: PublicAnalyticsDto): PublicAnalytics {
    return {
      playCount: dto.play_count,
      favoriteCount: dto.favorite_count,
      totalDownloadCount: dto.total_download_count,
      isFavorited: dto.is_favorited,
    };
  }

  adaptProducerAnalytics(dto: ProducerAnalyticsDto): ProducerAnalytics {
    return {
      playCount: dto.play_count,
      favoriteCount: dto.favorite_count,
      totalDownloadCount: dto.total_download_count,
      totalPurchaseCount: dto.total_purchase_count,
      purchasesByLicense: dto.purchases_by_license,
      totalRevenue: dto.total_revenue,
    };
  }
}
