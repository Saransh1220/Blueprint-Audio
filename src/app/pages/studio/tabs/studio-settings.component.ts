import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import type { AppCurrency } from '../../../models/money';
import { AuthService, ToastService } from '../../../services';

@Component({
  selector: 'app-studio-settings',
  imports: [CommonModule],
  templateUrl: './studio-settings.component.html',
  styleUrl: './studio-settings.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioSettingsComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

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

  savedCurrency = computed<AppCurrency>(() => this.currentUser()?.store_currency ?? 'USD');
  selectedCurrency = signal<AppCurrency>(this.savedCurrency());
  isSaving = signal(false);

  selectCurrency(currency: AppCurrency) {
    this.selectedCurrency.set(currency);
  }

  savePreferences() {
    if (this.isSaving()) return;

    this.isSaving.set(true);
    this.authService
      .updateProfile({
        store_currency: this.selectedCurrency(),
      })
      .subscribe({
        next: () => {
          this.isSaving.set(false);
          this.toastService.success('Store preferences updated successfully.');
        },
        error: (err) => {
          this.isSaving.set(false);
          this.toastService.error(err?.message || 'Failed to update store preferences.');
        },
      });
  }
}
