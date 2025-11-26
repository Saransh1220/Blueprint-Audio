import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <label class="theme-switch">
      <input
        type="checkbox"
        [checked]="themeService.currentTheme() === 'dark'"
        (change)="themeService.toggleTheme()"
      />
      <span class="slider round">
        <i class="fa-solid fa-sun sun-icon"></i>
        <i class="fa-solid fa-moon moon-icon"></i>
      </span>
    </label>
  `,
  styleUrls: ['./theme-toggle.scss'],
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}
