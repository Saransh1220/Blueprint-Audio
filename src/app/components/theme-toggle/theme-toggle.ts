import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './theme-toggle.html',
  styleUrls: ['./theme-toggle.scss'],
})
export class ThemeToggleComponent {
  themeService = inject(ThemeService);

  toggleMode() {
    this.themeService.toggleMode();
  }
}
