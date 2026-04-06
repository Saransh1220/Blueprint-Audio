import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { TokenRefreshService } from '../../services/token-refresh.service';

function clearLocalAuthState(): void {
  localStorage.removeItem('token');
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const tokenRefreshService = inject(TokenRefreshService);
  const token = localStorage.getItem('token');

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Don't intercept auth returning endpoints to prevent loops
      if (
        req.url.includes('/auth/refresh') ||
        req.url.includes('/login') ||
        req.url.includes('/auth/google') ||
        req.url.includes('/register') ||
        req.url.includes('/auth/verify-email') ||
        req.url.includes('/auth/resend-verification') ||
        req.url.includes('/auth/forgot-password') ||
        req.url.includes('/auth/reset-password') ||
        req.url.includes('/auth/logout')
      ) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        return tokenRefreshService.refreshTokenWithQueue().pipe(
          switchMap((res) => {
            return next(
              req.clone({
                setHeaders: {
                  Authorization: `Bearer ${res.token}`,
                },
              }),
            );
          }),
          catchError((err) => {
            clearLocalAuthState();
            router.navigate(['/login']);
            return throwError(() => err);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
