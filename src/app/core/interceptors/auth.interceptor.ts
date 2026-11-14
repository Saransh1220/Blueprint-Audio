import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionStateService } from '../services/session-state.service';
import { TokenRefreshService } from '../../services/token-refresh.service';

function isApiUrl(url: string, apiUrl: string): boolean {
  if (url.startsWith('/')) {
    return true;
  }
  if (!apiUrl) {
    return false;
  }
  return url.startsWith(apiUrl);
}

function isExcludedPath(url: string): boolean {
  return (
    url.includes('/auth/refresh') ||
    url.includes('/login') ||
    url.includes('/auth/google') ||
    url.includes('/register') ||
    url.includes('/auth/verify-email') ||
    url.includes('/auth/resend-verification') ||
    url.includes('/auth/forgot-password') ||
    url.includes('/auth/reset-password') ||
    url.includes('/auth/logout')
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenRefreshService = inject(TokenRefreshService);
  const sessionState = inject(SessionStateService);

  if (!isApiUrl(req.url, environment.apiUrl)) {
    return next(req);
  }

  const headers: Record<string, string> = {
    'X-Waveyard-Session': 'cookie',
  };

  const userId = sessionState.currentUserId();
  if (userId) {
    headers['X-Waveyard-Expected-Viewer'] = userId;
  } else if (req.url.includes('/preferences/currency') && req.method === 'PUT') {
    headers['X-Waveyard-Expected-Viewer'] = 'guest';
  }

  const modifiedReq = req.clone({
    withCredentials: true,
    setHeaders: headers,
  });

  const requestGeneration = sessionState.generation();

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (isExcludedPath(req.url)) {
        return throwError(() => error);
      }

      if (error.status === 409) {
        sessionState.setAnonymous();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (
        error.status === 403 &&
        (typeof error.error === 'string'
          ? error.error.includes('suspended')
          : error.error?.error?.includes?.('suspended'))
      ) {
        sessionState.setAnonymous();
        router.navigate(['/login']);
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (sessionState.generation() > requestGeneration) {
          return next(modifiedReq).pipe(
            catchError((retryErr) => {
              sessionState.setAnonymous();
              router.navigate(['/login']);
              return throwError(() => retryErr);
            }),
          );
        }

        return tokenRefreshService.refreshTokenWithQueue().pipe(
          switchMap(() => {
            sessionState.generation.update((g) => g + 1);
            return next(modifiedReq);
          }),
          catchError((err) => {
            sessionState.setAnonymous();
            router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
