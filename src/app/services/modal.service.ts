import { Injectable, signal, type Type } from '@angular/core';

import type { ModalData } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalState = signal<ModalData | null>(null);

  readonly state = this.modalState.asReadonly();
  readonly isOpen = signal(false);

  open(
    component: Type<unknown>,
    title?: string,
    data?: Record<string, unknown>,
    options?: { width?: string; height?: string },
  ) {
    this.modalState.set({ component, title, data, ...options });
    this.isOpen.set(true);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  }

  close() {
    this.isOpen.set(false);
    setTimeout(() => {
      this.modalState.set(null);
    }, 300); // Wait for animation
    document.body.style.overflow = '';
  }
}
