import { HttpErrorResponse, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { authInterceptor } from './auth.interceptor';
import { TokenRefreshService } from '../../services/token-refresh.service';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function setup() {
    const router = {
      navigate: vi.fn(),
    };
    const tokenRefreshService = {
      refreshTokenWithQueue: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: TokenRefreshService, useValue: tokenRefreshService },
      ],
    });

    return { router, tokenRefreshService };
  }

  it('adds bearer token header when token exists', () => {
    setup();
    localStorage.setItem('token', 'abc123');
    const req = new HttpRequest('GET', '/resource');
    const next = vi.fn((r: HttpRequest<unknown>) => of(r));
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(forwarded?.headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('forwards request unchanged when token is missing', () => {
    setup();
    const req = new HttpRequest('GET', '/resource');
    const next = vi.fn((r: HttpRequest<unknown>) => of(r));
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(next).toHaveBeenCalledWith(req);
    expect(forwarded?.headers.has('Authorization')).toBe(false);
  });

  it('does not try to refresh auth endpoints after a 401', () => {
    const { router, tokenRefreshService } = setup();
    localStorage.setItem('token', 'expired-token');
    const req = new HttpRequest('POST', '/login');
    const next = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    let receivedError: HttpErrorResponse | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe({
        error: (error: HttpErrorResponse) => {
          receivedError = error;
        },
      });
    });

    expect(tokenRefreshService.refreshTokenWithQueue).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(receivedError?.status).toBe(401);
  });

  it('refreshes the token and retries the failed request', () => {
    const { tokenRefreshService } = setup();
    localStorage.setItem('token', 'expired-token');
    tokenRefreshService.refreshTokenWithQueue.mockReturnValue(of({ token: 'fresh-token' }));

    const req = new HttpRequest('GET', '/protected');
    const next = vi.fn((forwardedReq: HttpRequest<unknown>) => {
      if (forwardedReq.headers.get('Authorization') === 'Bearer fresh-token') {
        return of(forwardedReq);
      }

      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
    });
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(tokenRefreshService.refreshTokenWithQueue).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
    expect(next.mock.calls[0][0].headers.get('Authorization')).toBe('Bearer expired-token');
    expect(next.mock.calls[1][0].headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(forwarded?.headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('logs out when token refresh fails', () => {
    const { router, tokenRefreshService } = setup();
    localStorage.setItem('token', 'expired-token');
    tokenRefreshService.refreshTokenWithQueue.mockReturnValue(
      throwError(() => new Error('refresh failed')),
    );

    const req = new HttpRequest('GET', '/protected');
    const next = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    let receivedError: Error | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe({
        error: (error: Error) => {
          receivedError = error;
        },
      });
    });

    expect(tokenRefreshService.refreshTokenWithQueue).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(receivedError?.message).toBe('refresh failed');
  });

  it('queues concurrent 401 responses behind one refresh request', () => {
    const { tokenRefreshService } = setup();
    localStorage.setItem('token', 'expired-token');
    const refresh$ = new Subject<{ token: string }>();
    tokenRefreshService.refreshTokenWithQueue.mockReturnValue(refresh$.asObservable());

    const reqA = new HttpRequest('GET', '/protected/a');
    const reqB = new HttpRequest('GET', '/protected/b');
    const next = vi.fn((forwardedReq: HttpRequest<unknown>) => {
      if (forwardedReq.headers.get('Authorization') === 'Bearer fresh-token') {
        return of(forwardedReq);
      }

      return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
    });

    let forwardedA: HttpRequest<unknown> | undefined;
    let forwardedB: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(reqA, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwardedA = value;
      });
      (authInterceptor(reqB, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwardedB = value;
      });
    });

    expect(tokenRefreshService.refreshTokenWithQueue).toHaveBeenCalledTimes(2);

    refresh$.next({ token: 'fresh-token' });
    refresh$.complete();

    expect(next).toHaveBeenCalledTimes(4);
    expect(forwardedA?.headers.get('Authorization')).toBe('Bearer fresh-token');
    expect(forwardedB?.headers.get('Authorization')).toBe('Bearer fresh-token');
  });

  it('does not refresh logout failures', () => {
    const { router, tokenRefreshService } = setup();
    localStorage.setItem('token', 'expired-token');
    const req = new HttpRequest('POST', '/auth/logout');
    const next = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe({
        error: () => undefined,
      });
    });

    expect(tokenRefreshService.refreshTokenWithQueue).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
