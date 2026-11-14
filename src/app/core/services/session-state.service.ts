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

  readonly currentUserId = computed(() => this.currentUser()?.id ?? null);
  readonly isVerified = computed(
    () => this.status() === 'verified' && this.currentUser() !== null,
  );

  setVerified(user: User): void {
    this.currentUser.set(user);
    this.status.set('verified');
    this.generation.update((g) => g + 1);
  }

  setAnonymous(): void {
    this.currentUser.set(null);
    this.status.set('anonymous');
    this.generation.update((g) => g + 1);
  }

  setUnavailable(): void {
    this.status.set('unavailable');
  }

  setLoading(): void {
    this.status.set('loading');
  }
}
