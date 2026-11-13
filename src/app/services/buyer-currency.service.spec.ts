import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GetCurrencyPreferenceRequest,
  SetCurrencyPreferenceRequest,
} from '../core/api/preference.requests';
import { ApiService } from '../core/services/api.service';
import { BuyerCurrencyService } from './buyer-currency.service';

describe('BuyerCurrencyService', () => {
  let service: BuyerCurrencyService;
  let apiServiceMock: { execute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    apiServiceMock = {
      execute: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [BuyerCurrencyService, { provide: ApiService, useValue: apiServiceMock }],
    });

    service = TestBed.inject(BuyerCurrencyService);
  });

  it('initializes with default values', () => {
    expect(service.preference()).toBeNull();
    expect(service.effective()).toBe('USD');
    expect(service.source()).toBe('default');
    expect(service.isAutomatic()).toBe(true);
    expect(service.isLoading()).toBe(false);
  });

  it('loads currency preference successfully and updates signals', () => {
    apiServiceMock.execute.mockReturnValue(
      of({
        preference: 'INR',
        effective: 'INR',
        source: 'profile',
      }),
    );

    service.load().subscribe((result) => {
      expect(result.preference).toBe('INR');
      expect(result.effective).toBe('INR');
      expect(result.source).toBe('profile');
    });

    expect(apiServiceMock.execute).toHaveBeenCalledWith(expect.any(GetCurrencyPreferenceRequest));
    expect(service.preference()).toBe('INR');
    expect(service.effective()).toBe('INR');
    expect(service.source()).toBe('profile');
    expect(service.isAutomatic()).toBe(false);
    expect(service.isLoading()).toBe(false);
  });

  it('handles load failure gracefully without throwing', () => {
    apiServiceMock.execute.mockReturnValue(throwError(() => new Error('network failure')));

    service.load().subscribe((result) => {
      expect(result.preference).toBeNull();
      expect(result.effective).toBe('USD');
    });

    expect(service.isLoading()).toBe(false);
  });

  it('sets currency preference and updates signals', () => {
    apiServiceMock.execute.mockReturnValue(
      of({
        preference: 'USD',
        effective: 'USD',
        source: 'cookie',
      }),
    );

    service.set('USD').subscribe((result) => {
      expect(result.preference).toBe('USD');
      expect(result.effective).toBe('USD');
    });

    expect(apiServiceMock.execute).toHaveBeenCalledWith(expect.any(SetCurrencyPreferenceRequest));
    expect(service.preference()).toBe('USD');
    expect(service.effective()).toBe('USD');
    expect(service.source()).toBe('cookie');
    expect(service.isAutomatic()).toBe(false);
  });

  it('sets automatic mode with null', () => {
    apiServiceMock.execute.mockReturnValue(
      of({
        preference: null,
        effective: 'INR',
        source: 'country',
      }),
    );

    service.set(null).subscribe((result) => {
      expect(result.preference).toBeNull();
      expect(result.effective).toBe('INR');
      expect(result.source).toBe('country');
    });

    expect(service.preference()).toBeNull();
    expect(service.effective()).toBe('INR');
    expect(service.source()).toBe('country');
    expect(service.isAutomatic()).toBe(true);
  });

  it('re-throws on set failure and resets loading state', () => {
    apiServiceMock.execute.mockReturnValue(throwError(() => new Error('bad request')));

    let errorThrown = false;
    service.set('INVALID').subscribe({
      error: () => {
        errorThrown = true;
      },
    });

    expect(errorThrown).toBe(true);
    expect(service.isLoading()).toBe(false);
  });
});
