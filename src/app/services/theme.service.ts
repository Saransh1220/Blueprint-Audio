import { DOCUMENT } from '@angular/common';
import { effect, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private document = inject(DOCUMENT);
  public currentMode = signal<'light' | 'dark'>('dark');
  private themeKey = 'theme-mode';

  constructor() {
    // Initialize THEME PRESET
    const storedTheme = localStorage.getItem(this.themeKey);
    if (storedTheme === 'light' || storedTheme === 'dark') {
      this.currentMode.set(storedTheme);
    }

    // Effect to update body attribute and localStorage
    effect(() => {
      const mode = this.currentMode();
      this.document.body.classList.toggle('dark-theme', mode === 'dark');
      localStorage.setItem(this.themeKey, mode);
    });
  }

  toggleMode() {
    this.currentMode.update((m) => (m === 'light' ? 'dark' : 'light'));
  }

  setMode(mode: 'light' | 'dark') {
    this.currentMode.set(mode);
  }
}
