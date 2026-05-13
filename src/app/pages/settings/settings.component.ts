import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AppearanceSettingsComponent } from '../../components/settings/appearance-settings/appearance-settings.component';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, AppearanceSettingsComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsComponent {
  themeService = inject(ThemeService);
  activeTab: 'appearance' | 'preferences' | 'account' = 'appearance';
}
