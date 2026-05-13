import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ThemeService } from '../../../services/theme.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-appearance-settings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './appearance-settings.component.html',
  styleUrls: ['./appearance-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppearanceSettingsComponent {
  themeService = inject(ThemeService);
  toastService = inject(ToastService);

  get currentMode() {
    return this.themeService.currentMode();
  }

  setMode(mode: 'light' | 'dark') {
    this.themeService.setMode(mode);
    this.toastService.show(`Switched to ${mode} mode`, 'success');
  }
}
