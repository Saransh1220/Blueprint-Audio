import { describe, expect, it } from 'vitest';
import { SuggestPriceRequest } from './fx.requests';

describe('SuggestPriceRequest', () => {
  it('builds a POST request to /fx/suggest-price with the given body', () => {
    const body = {
      from_currency: 'USD',
      to_currency: 'INR',
      amount_minor: 1999,
    };
    const req = new SuggestPriceRequest(body);
    expect(req.path).toBe('/fx/suggest-price');
    expect(req.method).toBe('POST');
    expect(req.body).toEqual(body);
  });
});
