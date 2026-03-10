import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { TokenRefreshService } from './token-refresh.service';

describe('TokenRefreshService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.resetTestingModule();
  });

  function setup(execute: ReturnType<typeof vi.fn>) {
    TestBed.configureTestingModule({
      providers: [TokenRefreshService, { provide: ApiService, useValue: { execute } }],
    });

    return TestBed.inject(TokenRefreshService);
  }

  it('stores refreshed tokens from the backend response', () => {
    const execute = vi.fn().mockReturnValue(of({ token: 'fresh-token' }));
    const service = setup(execute);

    service.refreshTokenWithQueue().subscribe();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBe('fresh-token');
  });

  it('queues concurrent refresh callers behind the first request', () => {
    const refresh$ = new Subject<{ token: string }>();
    const execute = vi.fn().mockReturnValue(refresh$.asObservable());
    const service = setup(execute);
    const results: string[] = [];

    service.refreshTokenWithQueue().subscribe((response) => {
      results.push(`first:${response.token}`);
    });
    service.refreshTokenWithQueue().subscribe((response) => {
      results.push(`second:${response.token}`);
    });

    expect(execute).toHaveBeenCalledTimes(1);

    refresh$.next({ token: 'queued-token' });
    refresh$.complete();

    expect(results).toEqual(['second:queued-token', 'first:queued-token']);
    expect(localStorage.getItem('token')).toBe('queued-token');
  });

  it('resets queue state after failures so the next refresh can retry', () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('refresh failed')))
      .mockReturnValueOnce(of({ token: 'retry-token' }));
    const service = setup(execute);
    const errors: string[] = [];

    service.refreshTokenWithQueue().subscribe({
      error: (error: Error) => {
        errors.push(error.message);
      },
    });
    service.refreshTokenWithQueue().subscribe();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(errors).toEqual(['refresh failed']);
    expect(localStorage.getItem('token')).toBe('retry-token');
  });
});
