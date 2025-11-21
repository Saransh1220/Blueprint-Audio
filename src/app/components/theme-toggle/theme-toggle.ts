import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  template: `
    <button (click)="themeService.toggleTheme()" class="theme-toggle-btn">
      @if (themeService.currentTheme() === 'light') {
        <i class="fa-solid fa-moon"></i>
      } @else {
        <i class="fa-solid fa-sun"></i>
      }
    </button>
  `,
  styleUrls: ['./theme-toggle.scss'],
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);
}
