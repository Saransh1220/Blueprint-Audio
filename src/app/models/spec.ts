import { MusicalKey } from './enums';

export interface Spec {
  id: string;
  type: string;
  category: 'beat' | 'sample';
  imageUrl: string;
  title: string;
  bpm: number;
  key: MusicalKey;
  tags: string[];
  price: number;
}
