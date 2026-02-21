import { HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { ApiService } from './api.service';

describe('ApiService', () => {
  function createService() {
    const http = {
      get: vi.fn().mockReturnValue(of({ ok: true })),
      post: vi.fn().mockReturnValue(of({ ok: true })),
      put: vi.fn().mockReturnValue(of({ ok: true })),
      patch: vi.fn().mockReturnValue(of({ ok: true })),
      delete: vi.fn().mockReturnValue(of({ ok: true })),
    };

    const service = Object.create(ApiService.prototype) as ApiService;
    (service as any).http = http;
    (service as any).baseUrl = 'http://localhost:8080';

    return { service, http };
  }

  it('execute dispatches by request method', () => {
    const { service, http } = createService();
    const params = new HttpParams().set('page', 1);

    service.execute({ method: 'GET', path: '/items', params }).subscribe();
    service.execute({ method: 'POST', path: '/items', body: { x: 1 }, params }).subscribe();
    service.execute({ method: 'PUT', path: '/items/1', body: { x: 2 }, params }).subscribe();
    service.execute({ method: 'PATCH', path: '/items/1', body: { x: 3 }, params }).subscribe();
    service.execute({ method: 'DELETE', path: '/items/1', params }).subscribe();

    expect(http.get).toHaveBeenCalledWith('http://localhost:8080/items', { params });
    expect(http.post).toHaveBeenCalledWith('http://localhost:8080/items', { x: 1 }, { params });
    expect(http.put).toHaveBeenCalledWith('http://localhost:8080/items/1', { x: 2 }, { params });
    expect(http.patch).toHaveBeenCalledWith('http://localhost:8080/items/1', { x: 3 }, { params });
    expect(http.delete).toHaveBeenCalledWith('http://localhost:8080/items/1', { params });
  });

  it('helper methods call matching HTTP client methods', () => {
    const { service, http } = createService();
    const params = new HttpParams().set('limit', 5);

    service.get('/g', params).subscribe();
    service.post('/p', { a: 1 }).subscribe();
    service.put('/u', { a: 2 }).subscribe();
    service.patch('/pa', { a: 3 }).subscribe();
    service.delete('/d').subscribe();

    expect(http.get).toHaveBeenCalledWith('http://localhost:8080/g', { params });
    expect(http.post).toHaveBeenCalledWith('http://localhost:8080/p', { a: 1 });
    expect(http.put).toHaveBeenCalledWith('http://localhost:8080/u', { a: 2 });
    expect(http.patch).toHaveBeenCalledWith('http://localhost:8080/pa', { a: 3 });
    expect(http.delete).toHaveBeenCalledWith('http://localhost:8080/d');
  });

  it('throws on unsupported method', () => {
    const { service } = createService();
    expect(() => service.execute({ method: 'TRACE' as never, path: '/x' }).subscribe()).toThrow(
      'Unsupported HTTP method: TRACE',
    );
  });

  it('upload dispatches by request method with progress options', () => {
    const { service, http } = createService();
    const params = new HttpParams().set('bucket', 'beats');
    const options = { params, reportProgress: true, observe: 'events' as const };

    service.upload({ method: 'POST', path: '/u1', body: { a: 1 }, params }).subscribe();
    service.upload({ method: 'PUT', path: '/u2', body: { a: 2 }, params }).subscribe();
    service.upload({ method: 'PATCH', path: '/u3', body: { a: 3 }, params }).subscribe();

    expect(http.post).toHaveBeenCalledWith('http://localhost:8080/u1', { a: 1 }, options);
    expect(http.put).toHaveBeenCalledWith('http://localhost:8080/u2', { a: 2 }, options);
    expect(http.patch).toHaveBeenCalledWith('http://localhost:8080/u3', { a: 3 }, options);
  });

  it('upload throws for unsupported methods', () => {
    const { service } = createService();
    expect(() => service.upload({ method: 'GET', path: '/u' } as never).subscribe()).toThrow(
      'Upload only supported for POST, PUT, PATCH. Got: GET',
    );
  });
});
