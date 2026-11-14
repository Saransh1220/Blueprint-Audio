import { HttpErrorResponse, HttpRequest, HttpResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Role, SystemRole, User } from '../../models';
import { SessionStateService } from '../services/session-state.service';
import { TokenRefreshService } from '../../services/token-refresh.service';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  const mockUser: User = {
    id: 'user-abc',
    name: 'Test',
    display_name: 'Tester',
    email: 'test@example.com',
    role: Role.PRODUCER,
    system_role: SystemRole.USER,
    status: 'active',
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  function setup() {
    const router = {
      navigate: vi.fn(),
    };
    const tokenRefreshService = {
      sequence: 0,
      refreshTokenWithQueue: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: router },
        { provide: TokenRefreshService, useValue: tokenRefreshService },
        SessionStateService,
      ],
    });

    const sessionState = TestBed.inject(SessionStateService);
    return { router, tokenRefreshService, sessionState };
  }

  it('adds session marker and withCredentials to API requests without Authorization header', () => {
    setup();
    const req = new HttpRequest('GET', `${environment.apiUrl}/api/resource`);
    const next = vi.fn((r: HttpRequest<unknown>) => of(r));
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(forwarded?.withCredentials).toBe(true);
    expect(forwarded?.headers.get('X-Waveyard-Session')).toBe('cookie');
    expect(forwarded?.headers.has('Authorization')).toBe(false);
  });

  it('attaches X-Waveyard-Expected-Viewer when user is signed in', () => {
    const { sessionState } = setup();
    sessionState.setVerified(mockUser);

    const req = new HttpRequest('GET', `${environment.apiUrl}/api/resource`);
    const next = vi.fn((r: HttpRequest<unknown>) => of(r));
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(forwarded?.headers.get('X-Waveyard-Expected-Viewer')).toBe('user-abc');
  });

  it('attaches X-Waveyard-Expected-Viewer: guest on PUT /preferences/currency when anonymous', () => {
    setup();
    const req = new HttpRequest('PUT', `${environment.apiUrl}/preferences/currency`, {
      currency: 'USD',
    });
    const next = vi.fn((r: HttpRequest<unknown>) => of(r));
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(forwarded?.headers.get('X-Waveyard-Expected-Viewer')).toBe('guest');
  });

  it('passes external URLs untouched', () => {
    setup();
    const req = new HttpRequest('GET', 'https://s3.amazonaws.com/my-bucket/audio.mp3');
    const next = vi.fn((r: HttpRequest<unknown>) => of(r));
    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(next).toHaveBeenCalledWith(req);
    expect(forwarded?.headers.has('X-Waveyard-Session')).toBe(false);
    expect(forwarded?.withCredentials).toBe(false);
  });

  it('does not try to refresh excluded auth endpoints after a 401', () => {
    const { router, tokenRefreshService } = setup();
    const req = new HttpRequest('POST', `${environment.apiUrl}/login`, {});
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

  it('refreshes the session and retries the failed request once on 401', () => {
    const { tokenRefreshService } = setup();
    tokenRefreshService.refreshTokenWithQueue.mockReturnValue(of(undefined));

    let attempts = 0;
    const req = new HttpRequest('GET', `${environment.apiUrl}/protected`);
    const next = vi.fn((forwardedReq: HttpRequest<unknown>) => {
      attempts++;
      if (attempts === 1) {
        return throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' }));
      }
      return of(forwardedReq);
    });

    let forwarded: HttpRequest<unknown> | undefined;

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe((value: HttpRequest<unknown>) => {
        forwarded = value;
      });
    });

    expect(tokenRefreshService.refreshTokenWithQueue).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(2);
    expect(forwarded).toBeDefined();
  });

  it('clears session and navigates to login when token refresh fails', () => {
    const { router, tokenRefreshService, sessionState } = setup();
    sessionState.setVerified(mockUser);
    tokenRefreshService.refreshTokenWithQueue.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'refresh failed' })),
    );

    const req = new HttpRequest('GET', `${environment.apiUrl}/protected`);
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
    expect(sessionState.currentUser()).toBeNull();
    expect(sessionState.status()).toBe('anonymous');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    expect(receivedError).toBeInstanceOf(HttpErrorResponse);
  });

  it('clears session and navigates to login on 409 SESSION_CHANGED', () => {
    const { router, sessionState } = setup();
    sessionState.setVerified(mockUser);

    const req = new HttpRequest('GET', `${environment.apiUrl}/protected`);
    const next = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 409, error: { code: 'SESSION_CHANGED' } })),
    );

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe({
        error: () => undefined,
      });
    });

    expect(sessionState.currentUser()).toBeNull();
    expect(sessionState.status()).toBe('anonymous');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('clears session and navigates to login on 403 suspension', () => {
    const { router, sessionState } = setup();
    sessionState.setVerified(mockUser);

    const req = new HttpRequest('GET', `${environment.apiUrl}/protected`);
    const next = vi.fn(() =>
      throwError(
        () =>
          new HttpErrorResponse({
            status: 403,
            error: { code: 'ACCOUNT_SUSPENDED' },
          }),
      ),
    );

    TestBed.runInInjectionContext(() => {
      (authInterceptor(req, next as never) as any).subscribe({
        error: () => undefined,
      });
    });

    expect(sessionState.currentUser()).toBeNull();
    expect(sessionState.status()).toBe('anonymous');
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it.each([409, 429, 503])('keeps the user signed in when a replay fails with %s', (status) => {
    const { router, tokenRefreshService, sessionState } = setup();
    sessionState.setVerified(mockUser);
    tokenRefreshService.refreshTokenWithQueue.mockReturnValue(of(undefined));
    const next = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 401 })))
      .mockReturnValueOnce(
        throwError(
          () => new HttpErrorResponse({ status, error: { code: 'IDEMPOTENCY_CONFLICT' } }),
        ),
      );
    const req = new HttpRequest('POST', `${environment.apiUrl}/orders`, {});
    TestBed.runInInjectionContext(() =>
      authInterceptor(req, next).subscribe({ error: () => undefined }),
    );
    expect(next).toHaveBeenCalledTimes(2);
    expect(sessionState.currentUser()).toEqual(mockUser);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('propagates a checkout conflict from the original request', () => {
    const { router, sessionState } = setup();
    sessionState.setVerified(mockUser);
    const error = new HttpErrorResponse({ status: 409, error: { code: 'PRICE_CHANGED' } });
    const req = new HttpRequest('POST', `${environment.apiUrl}/orders`, {});
    const onError = vi.fn();
    TestBed.runInInjectionContext(() =>
      authInterceptor(req, () => throwError(() => error)).subscribe({ error: onError }),
    );
    expect(onError).toHaveBeenCalledWith(error);
    expect(sessionState.currentUser()).toEqual(mockUser);
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each(['before 401', 'during refresh'])(
    'discards an obsolete request after switching accounts %s',
    (when) => {
      const { router, tokenRefreshService, sessionState } = setup();
      sessionState.setVerified(mockUser);
      const response = new Subject<never>();
      const refreshed = new Subject<void>();
      tokenRefreshService.refreshTokenWithQueue.mockReturnValue(refreshed);
      const next = vi.fn(() => response);
      const other = { ...mockUser, id: 'other-account' };
      const req = new HttpRequest('POST', `${environment.apiUrl}/orders`, {});
      const onError = vi.fn();
      TestBed.runInInjectionContext(() => authInterceptor(req, next).subscribe({ error: onError }));
      if (when === 'before 401') sessionState.setVerified(other);
      response.error(new HttpErrorResponse({ status: 401 }));
      if (when === 'during refresh') sessionState.setVerified(other);
      refreshed.next();
      refreshed.complete();
      expect(next).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(sessionState.currentUser()).toEqual(other);
      expect(router.navigate).not.toHaveBeenCalled();
    },
  );

  it.each([`${environment.apiUrl}.evil.example/path`, '//evil.example/api'])(
    'never adds session headers to lookalike destinations %s',
    (url) => {
      setup();
      const req = new HttpRequest('GET', url);
      const next = vi.fn(() => of(new HttpResponse()));
      TestBed.runInInjectionContext(() => authInterceptor(req, next).subscribe());
      expect(next).toHaveBeenCalledWith(req);
    },
  );

  it('fails closed when a legacy server returns an access token for cookie login', () => {
    setup();
    const req = new HttpRequest('POST', `${environment.apiUrl}/login`, {});
    const error = vi.fn();
    TestBed.runInInjectionContext(() =>
      authInterceptor(req, () =>
        of(new HttpResponse({ status: 200, body: { token: 'legacy' } })),
      ).subscribe({ error }),
    );
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 502 }));
    expect(localStorage.getItem('token')).toBeNull();
  });
});
