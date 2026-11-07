import { describe, expect, it } from 'vitest';
import {
  GetCurrencyPreferenceRequest,
  SetCurrencyPreferenceRequest,
} from './preference.requests';

describe('Preference Requests', () => {
  it('creates GetCurrencyPreferenceRequest with GET and path', () => {
    const req = new GetCurrencyPreferenceRequest();
    expect(req.path).toBe('/preferences/currency');
    expect(req.method).toBe('GET');
  });

  it('creates SetCurrencyPreferenceRequest with PUT, path and body', () => {
    const req = new SetCurrencyPreferenceRequest('INR');
    expect(req.path).toBe('/preferences/currency');
    expect(req.method).toBe('PUT');
    expect(req.body).toEqual({ currency: 'INR' });

    const reqNull = new SetCurrencyPreferenceRequest(null);
    expect(reqNull.body).toEqual({ currency: null });
  });
});
