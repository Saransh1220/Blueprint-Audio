import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CurrencyConfigurationService,
  parseCurrencyConfiguration,
} from './currency-configuration.service';

const jpy = { code: 'JPY', symbol: '¥', minor_unit_scale: 1, locale: 'ja-JP', gateway: null };

describe('currency configuration', () => {
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  beforeEach(() =>
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }),
  );

  it('loads a new currency without changing the money model', async () => {
    const service = TestBed.inject(CurrencyConfigurationService);
    const loaded = firstValueFrom(service.load());
    const req = TestBed.inject(HttpTestingController).expectOne(
      `${environment.apiUrl}/config/currencies`,
    );
    expect(req.request.headers.get('X-Skip-Loading')).toBe('true');
    req.flush({ currencies: [jpy] });
    await loaded;
    expect(service.currencies()).toEqual([jpy]);
    expect(service.status()).toBe('loaded');
    expect(Object.isFrozen(service.currencies()[0])).toBe(true);
  });

  it('keeps usable compatibility metadata when an old API or network is unavailable', async () => {
    const service = TestBed.inject(CurrencyConfigurationService);
    const loaded = firstValueFrom(service.load());
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/config/currencies`)
      .flush({}, { status: 404, statusText: 'Not found' });
    await loaded;
    expect(service.status()).toBe('unavailable');
    expect(service.currencies().map((c) => c.code)).toEqual(['INR', 'USD']);
    expect(service.currencies().every((c) => c.gateway === null)).toBe(true);
  });

  it('rejects malformed, duplicate and ambiguous metadata', () => {
    for (const input of [
      null,
      {},
      { currencies: [] },
      { currencies: [jpy, jpy] },
      ...[
        { code: 'usd' },
        { code: 'NOPE' },
        { symbol: '' },
        { symbol: '1234567890123' },
        { minor_unit_scale: 3 },
        { minor_unit_scale: 0 },
        { minor_unit_scale: 1e7 },
        { locale: '' },
        { locale: 'not_a_locale' },
        { gateway: '' },
        { gateway: 4 },
      ].map((change) => ({ currencies: [{ ...jpy, ...change }] })),
    ]) {
      expect(() => parseCurrencyConfiguration(input)).toThrow();
    }
  });

  it('retains fallback metadata after malformed API responses', async () => {
    const service = TestBed.inject(CurrencyConfigurationService);
    const loaded = firstValueFrom(service.load());
    TestBed.inject(HttpTestingController)
      .expectOne(`${environment.apiUrl}/config/currencies`)
      .flush({ currencies: [{ ...jpy, minor_unit_scale: 0 }] });
    await loaded;
    expect(service.status()).toBe('unavailable');
    expect(service.currencies()[0].code).toBe('INR');
  });
});
