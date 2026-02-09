import { provideRouter, Router, UrlTree } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { guestGuard } from './guest.guard';

describe('guestGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([])],
    });
    localStorage.clear();
  });

  it('allows activation when token is missing', () => {
    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects to dashboard when token exists', () => {
    localStorage.setItem('token', 'abc');
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => guestGuard({} as never, {} as never));

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/dashboard');
  });
});
