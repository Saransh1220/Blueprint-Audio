export interface SpecFormData {
  // Metadata
  title: string;
  category: 'beat' | 'sample';
  genre: string;
  bpm: number;
  key: string;
  description: string;
  tags: string[];

  // Licenses
  licenses: Array<{
    enabled: boolean;
    type: string;
    name: string;
    price: number;
    features: string[];
    file_types: string[];
  }>;

  // Files (create mode only)
  coverFile?: File | null;
  previewFile?: File | null;
  wavFile?: File | null;
  stemsFile?: File | null;
}
