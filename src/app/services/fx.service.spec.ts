import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';
import { SuggestPriceDto, SuggestPriceRequest } from '../core/api/fx.requests';
import { ApiService } from '../core/services/api.service';
import { FxService, RateUnavailableError } from './fx.service';

describe('FxService', () => {
  it('requests price suggestions and returns dto', async () => {
    const mockDto: SuggestPriceDto = {
      currency: 'INR',
      amount_minor: 165900,
      rounding: 'whole_unit',
      stale: false,
      source: 'fx_suggestion',
    };

    const mockApi = {
      execute: vi.fn().mockImplementation((req: any) => {
        expect(req).toBeInstanceOf(SuggestPriceRequest);
        expect(req.body).toEqual({
          from_currency: 'USD',
          to_currency: 'INR',
          amount_minor: 1999,
        });
        return of(mockDto);
      }),
    };

    TestBed.configureTestingModule({
      providers: [FxService, { provide: ApiService, useValue: mockApi }],
    });

    const service = TestBed.inject(FxService);
    const result = await new Promise<SuggestPriceDto>((resolve, reject) => {
      service.suggestPrice('USD', 'INR', 1999).subscribe({ next: resolve, error: reject });
    });

    expect(result).toEqual(mockDto);
  });

  it('transforms 503 RATE_UNAVAILABLE into typed RateUnavailableError', async () => {
    const mockApi = {
      execute: vi.fn().mockReturnValue(
        throwError(() => ({
          status: 503,
          error: { error: 'RATE_UNAVAILABLE', message: 'Rate not available' },
        })),
      ),
    };

    TestBed.configureTestingModule({
      providers: [FxService, { provide: ApiService, useValue: mockApi }],
    });

    const service = TestBed.inject(FxService);
    try {
      await new Promise((resolve, reject) => {
        service.suggestPrice('USD', 'INR', 1999).subscribe({ next: resolve, error: reject });
      });
      expect.fail('Expected error');
    } catch (err) {
      expect(err).toBeInstanceOf(RateUnavailableError);
      expect((err as RateUnavailableError).message).toContain('Rate not available');
    }
  });

  it('transforms 409 status into RateUnavailableError', async () => {
    const mockApi = {
      execute: vi.fn().mockReturnValue(
        throwError(() => ({
          status: 409,
          error: { message: 'FX rate expired or unusable' },
        })),
      ),
    };

    TestBed.configureTestingModule({
      providers: [FxService, { provide: ApiService, useValue: mockApi }],
    });

    const service = TestBed.inject(FxService);
    try {
      await new Promise((resolve, reject) => {
        service.suggestPrice('USD', 'INR', 1999).subscribe({ next: resolve, error: reject });
      });
      expect.fail('Expected error');
    } catch (err) {
      expect(err).toBeInstanceOf(RateUnavailableError);
    }
  });

  it('rethrows unexpected HTTP errors untouched', async () => {
    const originalError = { status: 400, error: { message: 'Invalid payload' } };
    const mockApi = {
      execute: vi.fn().mockReturnValue(throwError(() => originalError)),
    };

    TestBed.configureTestingModule({
      providers: [FxService, { provide: ApiService, useValue: mockApi }],
    });

    const service = TestBed.inject(FxService);
    try {
      await new Promise((resolve, reject) => {
        service.suggestPrice('USD', 'INR', 1999).subscribe({ next: resolve, error: reject });
      });
      expect.fail('Expected error');
    } catch (err) {
      expect(err).not.toBeInstanceOf(RateUnavailableError);
      expect(err).toEqual(originalError);
    }
  });
});
