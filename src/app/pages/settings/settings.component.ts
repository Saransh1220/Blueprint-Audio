import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { AppearanceSettingsComponent } from '../../components/settings/appearance-settings/appearance-settings.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, AppearanceSettingsComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  // We can track the active tab here if we want a manual tab system,
  // or just render specific components for now.
  activeTab = 'appearance';
}
