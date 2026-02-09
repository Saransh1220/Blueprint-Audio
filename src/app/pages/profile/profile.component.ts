import { Component, OnInit, inject, signal, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';
import { Role } from '../../models';
import { ConfirmDialogComponent } from '../../components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
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

  constructor() {
    // Effect to watch currentUser signal and update form when data loads
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
        // Update current user with new profile data
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
        this.profileForm.markAsPristine(); // Reset dirty state
        this.isSaving.set(false);
      },
      error: () => {
        this.toastService.show('Failed to update profile', 'error');
        this.isSaving.set(false);
      },
    });
  }

  navigateToStore() {
    const userId = this.currentUser()?.id;
    if (userId) {
      this.router.navigate(['/store', userId]);
    }
  }

  onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.show('File size must be less than 5MB', 'error');
        return;
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.show('Please select an image file', 'error');
        return;
      }

      this.selectedAvatarFile.set(file);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        this.avatarPreview.set(e.target?.result as string);
      };
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
        message: 'Are you sure you want to delete your avatar? This action cannot be undone.',
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
          this.authService.currentUser.set({
            ...this.currentUser()!,
            avatar_url: null,
          });
        }
        this.toastService.show('Avatar deleted successfully', 'success');
      },
      error: () => {
        this.toastService.show('Failed to delete avatar', 'error');
      },
    });
  }
}
