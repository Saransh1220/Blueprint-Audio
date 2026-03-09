import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';
import { AuthService } from '../../services/auth.service';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
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
        req.url.includes('/register')
      ) {
        return throwError(() => error);
      }

      if (error.status === 401) {
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshToken().pipe(
            switchMap((res) => {
              isRefreshing = false;
              refreshTokenSubject.next(res.token);

              // Retry current request immediately
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${res.token}`,
                  },
                }),
              );
            }),
            catchError((err) => {
              isRefreshing = false;
              authService.logout();
              return throwError(() => err);
            }),
          );
        } else {
          // Wait for the ongoing refresh to succeed and retry
          return refreshTokenSubject.pipe(
            filter((newToken) => newToken !== null),
            take(1),
            switchMap((newToken) => {
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${newToken}`,
                  },
                }),
              );
            }),
          );
        }
      }

      return throwError(() => error);
    }),
  );
};
