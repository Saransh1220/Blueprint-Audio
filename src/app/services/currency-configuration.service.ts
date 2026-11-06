import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { catchError, map, Observable, of, tap, timeout } from 'rxjs';
import { environment } from '../../environments/environment';
import { CurrencyDefinition, FALLBACK_CURRENCIES, normalizeCurrencyCode } from '../models/money';

export function parseCurrencyConfiguration(value: unknown): readonly CurrencyDefinition[] {
  const data = value as { currencies?: unknown } | null;
  if (
    !data ||
    !Array.isArray(data.currencies) ||
    !data.currencies.length ||
    data.currencies.length > 200
  ) {
    throw new Error('Invalid currency configuration');
  }
  const seen = new Set<string>();
  return Object.freeze(
    data.currencies.map((entry: unknown) => {
      const item = entry as CurrencyDefinition | null;
      if (
        !item ||
        typeof item.code !== 'string' ||
        normalizeCurrencyCode(item.code) !== item.code ||
        seen.has(item.code) ||
        typeof item.symbol !== 'string' ||
        !item.symbol ||
        item.symbol.length > 12 ||
        !Number.isInteger(item.minor_unit_scale) ||
        item.minor_unit_scale < 1 ||
        item.minor_unit_scale > 1e6 ||
        !Number.isInteger(Math.log10(item.minor_unit_scale)) ||
        typeof item.locale !== 'string' ||
        !item.locale ||
        !(item.gateway === null || (typeof item.gateway === 'string' && item.gateway.length > 0))
      ) {
        throw new Error('Invalid currency definition');
      }
      new Intl.NumberFormat(item.locale, { style: 'currency', currency: item.code });
      seen.add(item.code);
      return Object.freeze({
        code: item.code,
        symbol: item.symbol,
        minor_unit_scale: item.minor_unit_scale,
        locale: item.locale,
        gateway: item.gateway,
      });
    }),
  );
}

@Injectable({ providedIn: 'root' })
export class CurrencyConfigurationService {
  private readonly http = inject(HttpClient, { optional: true });
  private readonly definitions = signal<readonly CurrencyDefinition[]>(FALLBACK_CURRENCIES);
  readonly currencies = this.definitions.asReadonly();
  private readonly state = signal<'fallback' | 'loaded' | 'unavailable'>('fallback');
  readonly status = this.state.asReadonly();

  load(): Observable<void> {
    if (!this.http) return of(undefined);
    return this.http
      .get<unknown>(`${environment.apiUrl}/config/currencies`, {
        headers: { 'X-Skip-Loading': 'true' },
      })
      .pipe(
        timeout(3000),
        map(parseCurrencyConfiguration),
        tap((currencies) => {
          this.definitions.set(currencies);
          this.state.set('loaded');
        }),
        map(() => undefined),
        catchError(() => {
          this.state.set('unavailable');
          return of(undefined);
        }),
      );
  }
}
