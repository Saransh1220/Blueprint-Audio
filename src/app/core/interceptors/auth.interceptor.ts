import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { TokenRefreshService } from '../../services/token-refresh.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
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
            authService.logout();
            return throwError(() => err);
          }),
        );
      }

      return throwError(() => error);
    }),
  );
};
