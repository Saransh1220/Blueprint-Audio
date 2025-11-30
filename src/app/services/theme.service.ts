import { DOCUMENT } from '@angular/common';
import { effect, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private document = inject(DOCUMENT);
  public currentTheme = signal<string>('light'); // 'light' or 'dark'
  private localStorageKey = 'app-theme';

  constructor() {
    // Initialize theme from localStorage or system preference
    const storedTheme = localStorage.getItem(this.localStorageKey);
    if (storedTheme) {
      this.currentTheme.set(storedTheme);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentTheme.set(prefersDark ? 'dark' : 'light');
    }

    // Effect to update body class and localStorage whenever currentTheme changes
    effect(() => {
      const theme = this.currentTheme();
      if (theme === 'dark') {
        this.document.body.classList.add('dark-theme');
      } else {
        this.document.body.classList.remove('dark-theme');
      }
      localStorage.setItem(this.localStorageKey, theme);
    });
  }

  toggleTheme() {
    this.currentTheme.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  setTheme(theme: string) {
    if (theme === 'light' || theme === 'dark') {
      this.currentTheme.set(theme);
    }
  }
}
