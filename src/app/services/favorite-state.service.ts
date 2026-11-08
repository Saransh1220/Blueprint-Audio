import { Injectable, signal } from '@angular/core';
import type { Spec } from '../models';

@Injectable({ providedIn: 'root' })
export class FavoriteStateService {
  private readonly changes = signal(new Map<string, boolean>());
  private viewerId: string | undefined;
  private session = 0;

  setViewer(viewerId: string | undefined) {
    if (this.viewerId === viewerId) return;
    this.viewerId = viewerId;
    this.session++;
    this.changes.set(new Map());
  }

  isFavorited(spec: Spec): boolean {
    return this.changes().get(spec.id) ?? spec.analytics?.isFavorited ?? false;
  }

  recordChanges() {
    const session = this.session;
    return (specId: string, isFavorited: boolean) => {
      if (session !== this.session) return false;
      this.changes.update((changes) => new Map(changes).set(specId, isFavorited));
      return true;
    };
  }
}
