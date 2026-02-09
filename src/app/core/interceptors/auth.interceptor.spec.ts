import { HttpRequest } from '@angular/common/http';
import { authInterceptor } from './auth.interceptor';

describe('authInterceptor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('adds bearer token header when token exists', () => {
    localStorage.setItem('token', 'abc123');
    const req = new HttpRequest('GET', '/resource');
    const next = vi.fn((r: HttpRequest<unknown>) => r);

    const forwarded = authInterceptor(req, next as never) as HttpRequest<unknown>;

    expect(next).toHaveBeenCalledTimes(1);
    expect(forwarded.headers.get('Authorization')).toBe('Bearer abc123');
  });

  it('forwards request unchanged when token is missing', () => {
    const req = new HttpRequest('GET', '/resource');
    const next = vi.fn((r: HttpRequest<unknown>) => r);

    const forwarded = authInterceptor(req, next as never) as HttpRequest<unknown>;

    expect(next).toHaveBeenCalledWith(req);
    expect(forwarded.headers.has('Authorization')).toBe(false);
  });
});
