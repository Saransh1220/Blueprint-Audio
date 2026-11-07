export interface LicenseTierPriceDefault {
  type: string;
  name: string;
  subtitle: string;
  features: string[];
  file_types: string[];
  defaultsByCurrency: Record<string, number | null>;
}

export const LICENSE_TIER_DEFAULTS: readonly LicenseTierPriceDefault[] = [
  {
    type: 'Basic',
    name: 'Basic Lease',
    subtitle: 'mp3',
    features: ['MP3', 'Untagged', 'Limited Streams (50k)'],
    file_types: ['MP3'],
    defaultsByCurrency: {
      USD: 14.99,
      INR: 14.99,
    },
  },
  {
    type: 'Premium',
    name: 'Premium Lease',
    subtitle: 'mp3 + wav',
    features: ['MP3', 'WAV', 'Untagged', 'Limited Streams (500k)'],
    file_types: ['MP3', 'WAV'],
    defaultsByCurrency: {
      USD: 24.99,
      INR: 24.99,
    },
  },
  {
    type: 'Trackout',
    name: 'Trackout Lease',
    subtitle: 'wav + stems',
    features: ['MP3', 'WAV', 'Stems', 'Untagged', 'Unlimited Streams'],
    file_types: ['MP3', 'WAV', 'ZIP'],
    defaultsByCurrency: {
      USD: 49.99,
      INR: 49.99,
    },
  },
  {
    type: 'Unlimited',
    name: 'Unlimited Lease',
    subtitle: 'pro',
    features: ['Exclusive Rights', 'All Files Included', 'Full Ownership'],
    file_types: ['MP3', 'WAV', 'ZIP'],
    defaultsByCurrency: {
      USD: 99.99,
      INR: 99.99,
    },
  },
];

export function getDefaultPrice(tierType: string, currency: string): number | null {
  const tier = LICENSE_TIER_DEFAULTS.find(
    (t) => t.type.toLowerCase() === tierType.trim().toLowerCase(),
  );
  if (!tier) return null;
  const price = tier.defaultsByCurrency[currency.trim().toUpperCase()];
  return price !== undefined ? price : null;
}
