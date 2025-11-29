import { Injectable, signal, Type } from '@angular/core';

export interface ModalData {
  component: Type<any>;
  title?: string;
  data?: any;
}

@Injectable({
  providedIn: 'root',
})
export class ModalService {
  private modalState = signal<ModalData | null>(null);

  readonly state = this.modalState.asReadonly();
  readonly isOpen = signal(false);

  open(component: Type<any>, title?: string, data?: any) {
    this.modalState.set({ component, title, data });
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
