import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SuggestPriceDto, SuggestPriceRequest } from '../core/api/fx.requests';
import { ApiService } from '../core/services/api.service';

export class RateUnavailableError extends Error {
  constructor(message = 'Exchange rate is currently unavailable. Please enter a price manually.') {
    super(message);
    this.name = 'RateUnavailableError';
  }
}

@Injectable({ providedIn: 'root' })
export class FxService {
  private readonly api = inject(ApiService);

  suggestPrice(
    fromCurrency: string,
    toCurrency: string,
    amountMinor: number,
  ): Observable<SuggestPriceDto> {
    return this.api
      .execute(
        new SuggestPriceRequest({
          from_currency: fromCurrency,
          to_currency: toCurrency,
          amount_minor: amountMinor,
        }),
      )
      .pipe(
        catchError((err) => {
          if (
            err?.status === 503 ||
            err?.status === 409 ||
            err?.error?.error === 'RATE_UNAVAILABLE' ||
            err?.error?.code === 'RATE_UNAVAILABLE'
          ) {
            return throwError(
              () =>
                new RateUnavailableError(
                  err?.error?.message ||
                    'Exchange rate is currently unavailable. Please enter a price manually.',
                ),
            );
          }
          return throwError(() => err);
        }),
      );
  }
}
