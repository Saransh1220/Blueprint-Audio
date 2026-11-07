import { Injectable, inject, signal, computed } from '@angular/core';
import { catchError, map, of, tap } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
  GetCurrencyPreferenceRequest,
  SetCurrencyPreferenceRequest,
  type CurrencyPreferenceDto,
} from '../core/api/preference.requests';
import type { CurrencyPreference, CurrencyPreferenceSource } from '../models/preference';

@Injectable({ providedIn: 'root' })
export class BuyerCurrencyService {
  private readonly api = inject(ApiService);

  readonly preference = signal<string | null>(null);
  readonly effective = signal<string>('USD');
  readonly source = signal<CurrencyPreferenceSource>('default');
  readonly isLoading = signal<boolean>(false);

  readonly isAutomatic = computed(() => this.preference() === null);

  load() {
    this.isLoading.set(true);
    return this.api.execute(new GetCurrencyPreferenceRequest()).pipe(
      map((dto) => this.mapDto(dto)),
      tap((pref) => {
        this.preference.set(pref.preference);
        this.effective.set(pref.effective);
        this.source.set(pref.source);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        console.warn('Failed to load currency preference:', err);
        this.isLoading.set(false);
        return of({
          preference: this.preference(),
          effective: this.effective(),
          source: this.source(),
        });
      }),
    );
  }

  set(currency: string | null) {
    this.isLoading.set(true);
    return this.api.execute(new SetCurrencyPreferenceRequest(currency)).pipe(
      map((dto) => this.mapDto(dto)),
      tap((pref) => {
        this.preference.set(pref.preference);
        this.effective.set(pref.effective);
        this.source.set(pref.source);
        this.isLoading.set(false);
      }),
      catchError((err) => {
        console.warn('Failed to set currency preference:', err);
        this.isLoading.set(false);
        throw err;
      }),
    );
  }

  private mapDto(dto: CurrencyPreferenceDto): CurrencyPreference {
    return {
      preference: dto.preference,
      effective: dto.effective,
      source: dto.source as CurrencyPreferenceSource,
    };
  }
}
