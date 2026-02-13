import { HttpHeaders, HttpRequest } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, throwError } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { loadingInterceptor } from './loading.interceptor';

describe('loadingInterceptor', () => {
  function setup() {
    const loadingService = {
      show: vi.fn(),
      hide: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: LoadingService, useValue: loadingService }],
    });

    return { loadingService };
  }

  it('shows then hides loading around normal requests', () => {
    const { loadingService } = setup();
    const req = new HttpRequest('GET', '/resource');
    const stream = new Subject<unknown>();
    const next = vi.fn(() => stream.asObservable());

    let completed = false;
    TestBed.runInInjectionContext(() => {
      (loadingInterceptor(req, next as never) as Observable<unknown>).subscribe({
        complete: () => {
          completed = true;
        },
      });
    });

    expect(loadingService.show).toHaveBeenCalledTimes(1);
    expect(loadingService.hide).not.toHaveBeenCalled();

    stream.complete();
    expect(completed).toBe(true);
    expect(loadingService.hide).toHaveBeenCalledTimes(1);
  });

  it('skips loading service when X-Skip-Loading header exists', () => {
    const { loadingService } = setup();
    const req = new HttpRequest('GET', '/resource', null, {
      headers: new HttpHeaders({ 'X-Skip-Loading': '1' }),
    });
    const next = vi.fn((forwardedReq: HttpRequest<unknown>) => forwardedReq);

    let forwarded: HttpRequest<unknown> | null = null;
    TestBed.runInInjectionContext(() => {
      forwarded = loadingInterceptor(req, next as never) as HttpRequest<unknown>;
    });

    expect(next).toHaveBeenCalledWith(req);
    expect(forwarded).toBe(req);
    expect(loadingService.show).not.toHaveBeenCalled();
    expect(loadingService.hide).not.toHaveBeenCalled();
  });

  it('hides loading on error via finalize', () => {
    const { loadingService } = setup();
    const req = new HttpRequest('GET', '/resource');
    const next = vi.fn(() => throwError(() => new Error('boom')));

    TestBed.runInInjectionContext(() => {
      (loadingInterceptor(req, next as never) as Observable<unknown>).subscribe({
        error: () => {},
      });
    });

    expect(loadingService.show).toHaveBeenCalledTimes(1);
    expect(loadingService.hide).toHaveBeenCalledTimes(1);
  });
});
