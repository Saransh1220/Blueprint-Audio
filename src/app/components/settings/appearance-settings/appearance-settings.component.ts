import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { ThemeService, ToastService } from '../../../services';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appearance-settings.component.html',
  styleUrls: ['./appearance-settings.component.scss'],
})
export class AppearanceSettingsComponent {
  themeService = inject(ThemeService);
  toastService = inject(ToastService);

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

  getHeroGradient() {
    const theme = this.previewThemeDetails();
    if (!theme) return 'black';
    return `linear-gradient(135deg, ${theme.colors[0]}, ${theme.colors[1]})`;
  }

  applyTheme() {
    this.themeService.setTheme(this.previewTheme());
    this.toastService.show('Theme applied successfully', 'success');
  }

  toggleMode() {
    this.themeService.toggleMode();
  }
}
