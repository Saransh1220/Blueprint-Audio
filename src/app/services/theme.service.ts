import { DOCUMENT } from '@angular/common';
import { effect, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private document = inject(DOCUMENT);
  public activeTheme = signal<string>('vampire'); // 'vampire', 'neon', 'toxic', etc.
  private themeKey = 'app-theme-preset';

  public themes = [
    {
      id: 'vampire',
      name: 'Vampire',
      description: 'Gothic Red & Deep Violet',
      colors: ['#DC2626', '#0F0A15'],
    },
    {
      id: 'neon',
      name: 'Neon Sunset',
      description: 'Synthwave Pink & Slate',
      colors: ['#F43F5E', '#0F172A'],
    },
    {
      id: 'toxic',
      name: 'Toxic',
      description: 'Biohazard Lime & Asphalt',
      colors: ['#65A30D', '#020617'],
    },
    {
      id: 'royal',
      name: 'Royal',
      description: 'Majestic Blue & Gold',
      colors: ['#0284C7', '#0B1120'],
    },
    {
      id: 'mint',
      name: 'Mint',
      description: 'Fresh Green & Dark Emerald',
      colors: ['#10B981', '#064E3B'],
    },
    {
      id: 'onyx',
      name: 'Onyx',
      description: 'Monochrome Black & White',
      colors: ['#111827', '#000000'],
    },
  ];

  constructor() {
    // Initialize THEME PRESET
    const storedTheme = localStorage.getItem(this.themeKey);
    if (storedTheme) {
      this.activeTheme.set(storedTheme);
    }

    // Effect to update body attribute and localStorage
    effect(() => {
      const theme = this.activeTheme();
      // Handle Data Theme Attribute
      this.document.body.setAttribute('data-theme', theme);
      // Persist
      localStorage.setItem(this.themeKey, theme);
    });
  }

  setTheme(themeName: string) {
    this.activeTheme.set(themeName);
  }
}
