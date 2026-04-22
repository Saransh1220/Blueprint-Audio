import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class StudioShellService {
  readonly isMobileNavOpen = signal(false);

  toggleMobileNav() {
    this.isMobileNavOpen.update((open) => !open);
  }

  closeMobileNav() {
    this.isMobileNavOpen.set(false);
  }
}
