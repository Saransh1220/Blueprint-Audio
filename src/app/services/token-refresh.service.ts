import { Injectable, inject } from '@angular/core';
import { Observable, defer, finalize, from, lastValueFrom, map, share, tap } from 'rxjs';
import { RefreshRequest } from '../core/api/auth.requests';
import { SessionStateService } from '../core/services/session-state.service';
import { ApiService } from '../core/services/api.service';

// Cookie writes share one ordering within a tab, and across tabs with Web Locks.
let localSessionWrites: Promise<unknown> | undefined;

export function serializeSessionWrite<T>(operation: () => Observable<T>): Observable<T> {
  return defer(() => {
    const run = () => lastValueFrom(operation(), { defaultValue: undefined });
    const locks = globalThis.navigator?.locks;
    if (locks) return from(locks.request('waveyard-auth', run)) as Observable<T>;
    if (!localSessionWrites) {
      // Subscribe synchronously where no prior write is running.
      return new Observable<T>((subscriber) => {
        let release!: () => void;
        const current = new Promise<void>((resolve) => {
          release = resolve;
        });
        localSessionWrites = current;
        defer(operation).subscribe({
          next: (value) => subscriber.next(value),
          error: (error) => {
            finish();
            subscriber.error(error);
          },
          complete: () => {
            finish();
            subscriber.complete();
          },
        });
        function finish() {
          if (localSessionWrites === current) localSessionWrites = undefined;
          release();
        }
      });
    }
    const queued = localSessionWrites.then(run);
    const settled = queued.then(
      () => undefined,
      () => undefined,
    );
    localSessionWrites = settled;
    void settled.then(() => {
      if (localSessionWrites === settled) localSessionWrites = undefined;
    });
    return from(queued) as Observable<T>;
  });
}

@Injectable({ providedIn: 'root' })
export class TokenRefreshService {
  private readonly api = inject(ApiService);
  private readonly session = inject(SessionStateService);
  private inFlightRefresh$: Observable<void> | null = null;
  private completedRefreshes = 0;

  get sequence(): number {
    return this.completedRefreshes;
  }

  refreshTokenWithQueue(): Observable<void> {
    return defer(() => {
      if (this.inFlightRefresh$) return this.inFlightRefresh$;
      const clear = () => {
        this.inFlightRefresh$ = null;
      };
      const generation = this.session.generation();
      this.inFlightRefresh$ = serializeSessionWrite(() => {
        if (generation !== this.session.generation() || this.session.logoutStatus() !== null) {
          throw new Error('The session changed before refresh.');
        }
        return this.api.execute(new RefreshRequest());
      }).pipe(
        map((body) => {
          if (body != null) throw new Error('The server did not return a cookie session.');
        }),
        tap({ next: () => this.completedRefreshes++, error: clear, complete: clear }),
        finalize(() => {
          // A synchronous subscriber may have already started a new request.
          if (this.inFlightRefresh$ === request) clear();
        }),
        share({ resetOnRefCountZero: false }),
      );
      const request = this.inFlightRefresh$;
      return request;
    });
  }
}
