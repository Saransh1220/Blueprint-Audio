import { Injectable, computed, signal } from '@angular/core';
import { User } from '../../models';

export type SessionStatus = 'loading' | 'anonymous' | 'verified' | 'unavailable';

@Injectable({
  providedIn: 'root',
})
export class SessionStateService {
  readonly currentUser = signal<User | null>(null);
  readonly status = signal<SessionStatus>('loading');
  readonly generation = signal<number>(0);
  readonly logoutStatus = signal<'pending' | 'failed' | null>(null);

  readonly currentUserId = computed(() => this.currentUser()?.id ?? null);
  readonly isVerified = computed(() => this.status() === 'verified' && this.currentUser() !== null);

  setVerified(user: User): void {
    const changed = this.currentUserId() !== user.id;
    this.currentUser.set(user);
    this.status.set('verified');
    if (changed) this.invalidate();
  }

  setAnonymous(): void {
    this.currentUser.set(null);
    this.status.set('anonymous');
    this.invalidate();
  }

  invalidate(): void {
    this.generation.update((generation) => generation + 1);
  }

  setUnavailable(): void {
    this.status.set('unavailable');
  }

  setLoading(): void {
    this.status.set('loading');
  }
}
