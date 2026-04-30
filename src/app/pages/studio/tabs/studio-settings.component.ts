import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../services';

@Component({
  selector: 'app-studio-settings',
  imports: [CommonModule],
  templateUrl: './studio-settings.component.html',
  styleUrl: './studio-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioSettingsComponent {
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  displayName = computed(
    () => this.currentUser()?.display_name || this.currentUser()?.name || 'Your Name',
  );
  handle = computed(() => this.currentUser()?.name?.toLowerCase().replace(/\s+/g, '.') || 'handle');
  avatarLetter = computed(() => this.displayName().charAt(0).toLowerCase() || 'r');
  location = computed(() => 'India');

  notifications = [
    { label: 'New sale', desc: 'When a license is purchased', on: true },
    { label: 'New play', desc: 'When your beat gets streamed', on: false },
    { label: 'Messages', desc: 'Buyer and collaborator DMs', on: true },
    { label: 'Payout confirmed', desc: 'When earnings are settled', on: true },
  ];
}
