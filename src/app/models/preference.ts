export type CurrencyPreferenceSource = 'profile' | 'cookie' | 'country' | 'default';

export interface CurrencyPreference {
  preference: string | null;
  effective: string;
  source: CurrencyPreferenceSource;
}
