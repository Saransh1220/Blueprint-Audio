import { Injectable, signal } from '@angular/core';

import type { Spec } from '../models';

/** The beat whose license picker is open, or null. Opening it shows the warp purchase dialog. */
@Injectable({ providedIn: 'root' })
export class PurchaseDialogService {
  private readonly current = signal<Spec | null>(null);

  readonly spec = this.current.asReadonly();

  open(spec: Spec): void {
    this.current.set(spec);
  }

  close(): void {
    this.current.set(null);
  }
}
