import type { MusicalKey } from './enums';

export type LicenseType = 'Basic' | 'Premium' | 'Trackout' | 'Unlimited';

export interface LicenseOption {
  type: LicenseType;
  name: string;
  price: number;
  features: string[];
  fileTypes: string[];
}

export interface Spec {
  id: string;
  type: string;
  category: 'beat' | 'sample';
  imageUrl: string;
  title: string;
  bpm: number;
  key: MusicalKey;
  tags: string[];
  price: number; // Starting price
  licenses: LicenseOption[];
  audioUrl?: string; // Optional for now to avoid strict checks everywhere immediately
}
