import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, catchError, filter, finalize, map, take, tap, throwError } from 'rxjs';
import { RefreshRequest } from '../core/api/auth.requests';
import { ApiService } from '../core/services/api.service';

interface RefreshResponse {
  token: string;
}

@Injectable({
  providedIn: 'root',
})
export class TokenRefreshService {
  private readonly api = inject(ApiService);
  private isRefreshing = false;
  private readonly refreshTokenSubject = new BehaviorSubject<string | null>(null);

  refreshTokenWithQueue() {
    if (this.isRefreshing) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1),
        map((token) => ({ token })),
      );
    }

    this.isRefreshing = true;
    this.refreshTokenSubject.next(null);

    return this.api.execute<RefreshResponse>(new RefreshRequest()).pipe(
      map((response) => {
        if (!response?.token) {
          throw new Error('Refresh token response missing token');
        }

        return response;
      }),
      tap((response) => {
        localStorage.setItem('token', response.token);
        this.refreshTokenSubject.next(response.token);
      }),
      catchError((error) => {
        this.refreshTokenSubject.next(null);
        return throwError(() => error);
      }),
      finalize(() => {
        this.isRefreshing = false;
      }),
    );
  }
}
