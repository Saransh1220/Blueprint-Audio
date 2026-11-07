import { ApiRequest, HttpMethod } from './api-request';

export interface SuggestPriceRequestBody {
  from_currency: string;
  to_currency: string;
  amount_minor: number;
}

export interface SuggestPriceDto {
  currency: string;
  amount_minor: number;
  rate_as_of?: string;
  rate_fetched_at?: string;
  stale?: boolean;
  source?: string;
  rounding?: 'marketplace_99' | 'whole_unit' | 'none' | string;
}

export class SuggestPriceRequest implements ApiRequest<SuggestPriceDto> {
  readonly path = '/fx/suggest-price';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: SuggestPriceDto;

  constructor(readonly body: SuggestPriceRequestBody) {}
}
