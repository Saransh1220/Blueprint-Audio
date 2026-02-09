import type { MusicalKey } from './enums';

export interface GenreModel {
  id: string;
  name: string;
  slug: string;
}

export type LicenseType = 'Basic' | 'Premium' | 'Trackout' | 'Unlimited';

export interface LicenseOption {
  id: string;
  type: LicenseType;
  name: string;
  price: number;
  features: string[];
  fileTypes: string[];
}

export interface PublicAnalytics {
  playCount: number;
  favoriteCount: number;
  totalDownloadCount: number;
  isFavorited?: boolean; // Only present if user is authenticated
}

export interface ProducerAnalytics {
  playCount: number;
  favoriteCount: number;
  totalDownloadCount: number;
  totalPurchaseCount: number;
  purchasesByLicense: Record<string, number>; // e.g., { "Basic": 10, "Premium": 5 }
  totalRevenue: number;
}

export interface Spec {
  id: string;
  producerId: string;
  producerName: string;
  type: string;
  category: 'beat' | 'sample';
  imageUrl: string;
  title: string;
  bpm: number;
  key: MusicalKey;
  tags: string[];
  price: number; // Starting price
  genres: GenreModel[];
  licenses: LicenseOption[];
  audioUrl?: string; // Optional for now to avoid strict checks everywhere immediately
  duration?: number; // Audio duration in seconds
  freeMp3Enabled?: boolean; // Whether free MP3 download is available
  analytics?: PublicAnalytics; // Public analytics data
}
