import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appearance-settings.component.html',
  styleUrls: ['./appearance-settings.component.scss'],
})
export class AppearanceSettingsComponent {
  themeService = inject(ThemeService);

  // Using the service's theme list
  themes = this.themeService.themes;

  // Current active theme (for comparison)
  activeTheme = this.themeService.activeTheme;
  currentMode = this.themeService.currentMode;

  // Local preview state
  previewTheme = signal<string>(this.activeTheme()); // Initialize with active theme

  // Computed derived state for the template
  previewThemeDetails = computed(() => {
    return this.themes.find((t) => t.id === this.previewTheme());
  });

  constructor() {
    // Update preview if the active theme changes externally
    effect(() => {
      this.previewTheme.set(this.activeTheme());
    });
  }

  selectPreview(themeId: string) {
    this.previewTheme.set(themeId);
  }

  applyTheme() {
    this.themeService.setTheme(this.previewTheme());
  }

  toggleMode() {
    this.themeService.toggleMode();
  }
}
