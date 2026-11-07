import type { ApiRequest, HttpMethod } from './api-request';

export interface CurrencyPreferenceDto {
  preference: string | null;
  effective: string;
  source: string;
}

export interface SetCurrencyPreferenceDto {
  currency: string | null;
}

export class GetCurrencyPreferenceRequest implements ApiRequest<CurrencyPreferenceDto> {
  readonly path = '/preferences/currency';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: CurrencyPreferenceDto;
}

export class SetCurrencyPreferenceRequest implements ApiRequest<CurrencyPreferenceDto> {
  readonly path = '/preferences/currency';
  readonly method: HttpMethod = 'PUT';
  readonly body: SetCurrencyPreferenceDto;
  readonly _responseType?: CurrencyPreferenceDto;

  constructor(currency: string | null) {
    this.body = { currency };
  }
}
