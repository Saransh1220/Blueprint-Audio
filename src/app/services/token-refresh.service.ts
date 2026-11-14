import { Injectable, inject } from '@angular/core';
import { Observable, finalize, shareReplay, tap } from 'rxjs';
import { RefreshRequest } from '../core/api/auth.requests';
import { ApiService } from '../core/services/api.service';

@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private readonly api = inject(ApiService);

  private inFlightRefresh$: Observable<void> | null = null;
  refreshSequence = 0;

  refreshTokenWithQueue(): Observable<void> {
    if (this.inFlightRefresh$) {
      return this.inFlightRefresh$;
    }

    this.inFlightRefresh$ = this.api.execute(new RefreshRequest()).pipe(
      tap(() => {
        this.refreshSequence++;
      }),
      finalize(() => {
        this.inFlightRefresh$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false }),
    );

    return this.inFlightRefresh$;
  }
}
