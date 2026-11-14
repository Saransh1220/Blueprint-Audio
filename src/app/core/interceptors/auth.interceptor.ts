import { HttpErrorResponse, HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, throwError, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenRefreshService } from '../../services/token-refresh.service';
import { SessionStateService } from '../services/session-state.service';

const sessionEndpoints = new Set(['/login', '/auth/google', '/auth/refresh', '/auth/logout']);
const noRefresh = new Set([
  ...sessionEndpoints,
  '/register',
  '/auth/verify-email',
  '/auth/resend-verification',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/config/currencies',
]);

function apiPath(url: string, apiUrl: string): string | null {
  try {
    const base = new URL(apiUrl, location.origin);
    const target = new URL(url, location.origin);
    const prefix = base.pathname.replace(/\/$/, '');
    if (target.origin !== base.origin || !target.pathname.startsWith(prefix + '/')) return null;
    return target.pathname.slice(prefix.length);
  } catch {
    return null;
  }
}

function errorCode(error: HttpErrorResponse): string | undefined {
  if (typeof error.error !== 'string') return error.error?.code;
  try {
    return JSON.parse(error.error)?.code;
  } catch {
    return undefined;
  }
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const path = apiPath(req.url, environment.apiUrl);
  if (!path) return next(req);

  const router = inject(Router);
  const refresh = inject(TokenRefreshService);
  const session = inject(SessionStateService);
  if (session.logoutStatus() !== null && path !== '/auth/logout') {
    return throwError(
      () => new HttpErrorResponse({ status: 409, error: { code: 'LOGOUT_PENDING' } }),
    );
  }

  const cookieWrite = sessionEndpoints.has(path);
  const headers: Record<string, string> = { 'X-Waveyard-Session': 'cookie' };
  const userId = session.currentUserId();
  if (userId && !cookieWrite && path !== '/me') {
    headers['X-Waveyard-Expected-Viewer'] = userId;
  } else if (path === '/preferences/currency' && req.method === 'PUT') {
    headers['X-Waveyard-Expected-Viewer'] = 'guest';
  }

  const request = req.clone({ withCredentials: true, setHeaders: headers });
  if (cookieWrite) {
    return next(request).pipe(
      timeout({ first: 15000, each: 15000 }),
      map((event) => {
        if (event instanceof HttpResponse && event.status !== 204) {
          throw new HttpErrorResponse({
            status: 502,
            error: { code: 'COOKIE_SESSION_UNAVAILABLE' },
            url: request.url,
          });
        }
        return event;
      }),
    );
  }
  if (noRefresh.has(path)) return next(request);

  const generation = session.generation();
  const sequence = refresh.sequence;
  const stillCurrent = () => generation === session.generation() && session.logoutStatus() === null;
  const handleSessionError = (error: HttpErrorResponse, terminal401: boolean) => {
    if (!stillCurrent() || !session.isVerified()) return;
    const code = errorCode(error);
    if (
      (terminal401 && error.status === 401) ||
      (error.status === 403 && code === 'ACCOUNT_SUSPENDED') ||
      (error.status === 409 && code === 'SESSION_CHANGED')
    ) {
      session.setAnonymous();
      void router.navigate(['/login']);
    }
  };

  return next(request).pipe(
    catchError((error: HttpErrorResponse) => {
      if (!stillCurrent() || error.status !== 401) {
        handleSessionError(error, false);
        return throwError(() => error);
      }
      const ready = refresh.sequence > sequence ? of(undefined) : refresh.refreshTokenWithQueue();
      return ready.pipe(
        catchError((refreshError: HttpErrorResponse) => {
          handleSessionError(refreshError, true);
          return throwError(() => refreshError);
        }),
        switchMap(() => {
          if (!stillCurrent()) return throwError(() => error);
          return next(request).pipe(
            catchError((retryError: HttpErrorResponse) => {
              handleSessionError(retryError, true);
              return throwError(() => retryError);
            }),
          );
        }),
      );
    }),
  );
};
