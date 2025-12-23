import { DOCUMENT } from '@angular/common';
import { effect, Injectable, inject, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private document = inject(DOCUMENT);
  public currentMode = signal<string>('light'); // 'light' or 'dark'
  public activeTheme = signal<string>('vampire'); // 'vampire', 'neon', 'toxic'
  private modeKey = 'app-mode';
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
    // Initialize MODE (Light/Dark)
    const storedMode = localStorage.getItem(this.modeKey);
    if (storedMode) {
      this.currentMode.set(storedMode);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.currentMode.set(prefersDark ? 'dark' : 'light');
    }

    // Initialize THEME PRESET
    const storedTheme = localStorage.getItem(this.themeKey);
    if (storedTheme) {
      this.activeTheme.set(storedTheme);
    }

    // Effect to update body class/attributes and localStorage
    effect(() => {
      const mode = this.currentMode();
      const theme = this.activeTheme();

      console.log(`ThemeService update: Mode=${mode}, Theme=${theme}`);

      // Handle Dark Mode Class
      if (mode === 'dark') {
        this.document.body.classList.add('dark-theme');
        this.document.body.classList.remove('light-theme');
      } else {
        this.document.body.classList.remove('dark-theme');
        this.document.body.classList.add('light-theme');
      }

      // Handle Data Theme Attribute
      this.document.body.setAttribute('data-theme', theme);

      // Persist
      localStorage.setItem(this.modeKey, mode);
      localStorage.setItem(this.themeKey, theme);
    });
  }

  toggleMode() {
    this.currentMode.update((current) => (current === 'light' ? 'dark' : 'light'));
  }

  setMode(mode: string) {
    if (mode === 'light' || mode === 'dark') {
      this.currentMode.set(mode);
    }
  }

  setTheme(themeName: string) {
    this.activeTheme.set(themeName);
  }
}
