import { Component, OnInit, computed, effect, inject, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { UserService } from '../../../services/user.service';
import { ToastService } from '../../../services/toast.service';
import { Role } from '../../../models';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-studio-profile',
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './studio-profile.component.html',
  styleUrl: './studio-profile.component.scss',
})
export class StudioProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  readonly Role = Role;
  currentUser = this.authService.currentUser;
  profileForm!: FormGroup;

  isSaving = signal(false);
  isUploadingAvatar = signal(false);
  selectedAvatarFile = signal<File | null>(null);
  avatarPreview = signal<string | null>(null);
  activeTab = signal<'profile' | 'social'>('profile');
  tags = signal(['Trap', 'Lo-fi', 'Cinematic', 'Moody']);

  displayName = computed(() => {
    const fromForm = this.profileForm?.get('display_name')?.value;
    const user = this.currentUser();
    return fromForm || user?.display_name || user?.name || 'Producer';
  });

  handle = computed(
    () =>
      this.displayName()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.+|\.+$/g, '') || 'producer',
  );

  avatarLetter = computed(() => this.displayName().slice(0, 1).toLowerCase() || 'p');

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (user && this.profileForm) {
        this.profileForm.patchValue({
          bio: user.bio || '',
          display_name: user.display_name || '',
          instagram_url: user.instagram_url || '',
          twitter_url: user.twitter_url || '',
          youtube_url: user.youtube_url || '',
          spotify_url: user.spotify_url || '',
        });
        this.profileForm.markAsPristine();
      }
    });
  }

  ngOnInit() {
    this.initForm();
  }

  private initForm() {
    const user = this.currentUser();
    this.profileForm = this.fb.group({
      bio: [user?.bio || '', [Validators.maxLength(500)]],
      display_name: [user?.display_name || '', [Validators.maxLength(50)]],
      instagram_url: [user?.instagram_url || '', [Validators.pattern(/^https?:\/\/.*/)]],
      twitter_url: [user?.twitter_url || '', [Validators.pattern(/^https?:\/\/.*/)]],
      youtube_url: [user?.youtube_url || '', [Validators.pattern(/^https?:\/\/.*/)]],
      spotify_url: [user?.spotify_url || '', [Validators.pattern(/^https?:\/\/.*/)]],
    });
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.toastService.show('Please fix the form errors', 'error');
      return;
    }
    this.isSaving.set(true);
    this.userService.updateProfile(this.profileForm.value).subscribe({
      next: (profile) => {
        if (this.currentUser()) {
          this.authService.currentUser.set({
            ...this.currentUser()!,
            bio: profile.bio,
            display_name: profile.display_name,
            instagram_url: profile.instagram_url,
            twitter_url: profile.twitter_url,
            youtube_url: profile.youtube_url,
            spotify_url: profile.spotify_url,
          });
        }
        this.toastService.show('Profile updated successfully', 'success');
        this.profileForm.markAsPristine();
        this.isSaving.set(false);
      },
      error: () => {
        this.toastService.show('Failed to update profile', 'error');
        this.isSaving.set(false);
      },
    });
  }

  navigateToCatalog() {
    this.router.navigate(['/explore']);
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.show('File size must be less than 5MB', 'error');
        return;
      }
      if (!file.type.startsWith('image/')) {
        this.toastService.show('Please select an image file', 'error');
        return;
      }
      this.selectedAvatarFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  uploadAvatar() {
    const file = this.selectedAvatarFile();
    if (!file) return;
    this.isUploadingAvatar.set(true);
    this.authService.uploadAvatar(file).subscribe({
      next: () => {
        this.toastService.show('Avatar uploaded successfully', 'success');
        this.selectedAvatarFile.set(null);
        this.avatarPreview.set(null);
        this.isUploadingAvatar.set(false);
      },
      error: () => {
        this.toastService.show('Failed to upload avatar', 'error');
        this.isUploadingAvatar.set(false);
      },
    });
  }

  cancelAvatarUpload() {
    this.selectedAvatarFile.set(null);
    this.avatarPreview.set(null);
  }

  deleteAvatar() {
    if (this.confirmDialog) {
      this.confirmDialog.open({
        title: 'Delete Avatar',
        message: 'Are you sure you want to delete your avatar?',
        confirmText: 'Delete',
        cancelText: 'Cancel',
        type: 'danger',
      });
    }
  }

  onDeleteConfirmed() {
    this.userService.updateProfile({ avatar_url: '' }).subscribe({
      next: () => {
        if (this.currentUser()) {
          this.authService.currentUser.set({ ...this.currentUser()!, avatar_url: null });
        }
        this.toastService.show('Avatar deleted successfully', 'success');
      },
      error: () => this.toastService.show('Failed to delete avatar', 'error'),
    });
  }
}
