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

  it('increments sequence on successful refresh without writing to localStorage', () => {
    const execute = vi.fn().mockReturnValue(of(undefined));
    const service = setup(execute);

    service.refreshTokenWithQueue().subscribe();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(service.sequence).toBe(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('coalesces concurrent refresh callers behind a single in-flight request', () => {
    const refresh$ = new Subject<void>();
    const execute = vi.fn().mockReturnValue(refresh$.asObservable());
    const service = setup(execute);
    let firstCompleted = false;
    let secondCompleted = false;

    service.refreshTokenWithQueue().subscribe(() => {
      firstCompleted = true;
    });
    service.refreshTokenWithQueue().subscribe(() => {
      secondCompleted = true;
    });

    expect(execute).toHaveBeenCalledTimes(1);

    refresh$.next();
    refresh$.complete();

    expect(firstCompleted).toBe(true);
    expect(secondCompleted).toBe(true);
    expect(service.sequence).toBe(1);
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('resets in-flight state after failures and propagates error to all waiters', () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(throwError(() => new Error('refresh failed')))
      .mockReturnValueOnce(of(undefined));
    const service = setup(execute);
    const errors: string[] = [];

    service.refreshTokenWithQueue().subscribe({
      error: (error: Error) => {
        errors.push(error.message);
      },
    });

    expect(execute).toHaveBeenCalledTimes(1);
    expect(errors).toEqual(['refresh failed']);

    // Next attempt retries cleanly
    service.refreshTokenWithQueue().subscribe();
    expect(execute).toHaveBeenCalledTimes(2);
    expect(service.sequence).toBe(1);
  });

  it('delivers one in-flight failure to every waiter and starts a fresh request on retry', () => {
    const response = new Subject<void>();
    const execute = vi.fn().mockReturnValueOnce(response).mockReturnValueOnce(of(undefined));
    const service = setup(execute);
    const first = vi.fn();
    const second = vi.fn();
    service.refreshTokenWithQueue().subscribe({ error: first });
    service.refreshTokenWithQueue().subscribe({ error: second });
    const failure = new Error('temporary failure');
    response.error(failure);
    expect(first).toHaveBeenCalledWith(failure);
    expect(second).toHaveBeenCalledWith(failure);
    expect(execute).toHaveBeenCalledTimes(1);
    service.refreshTokenWithQueue().subscribe();
    expect(service.sequence).toBe(1);
    expect(execute).toHaveBeenCalledTimes(2);
  });
});
