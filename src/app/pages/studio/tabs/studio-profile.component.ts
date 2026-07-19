import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { map, of, switchMap } from 'rxjs';
import { ConfirmDialogComponent } from '../../../components/confirm-dialog/confirm-dialog.component';
import { PublicUserResponse } from '../../../core/api/user.requests';
import { Role } from '../../../models';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { UserService } from '../../../services/user.service';
import { resolveMediaUrl } from '../../../utils/media-url';

@Component({
  selector: 'app-studio-profile',
  imports: [CommonModule, ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './studio-profile.component.html',
  styleUrl: './studio-profile.component.scss',
})
export class StudioProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  @ViewChild(ConfirmDialogComponent) confirmDialog!: ConfirmDialogComponent;

  readonly Role = Role;
  currentUser = this.authService.currentUser;
  profileForm!: FormGroup;

  isSaving = signal(false);
  isUploadingAvatar = signal(false);
  selectedBannerFile = signal<File | null>(null);
  bannerPreview = signal<string | null>(null);
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
  profileBannerUrl = computed(() =>
    resolveMediaUrl(this.bannerPreview() || this.currentUser()?.banner_url),
  );

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
    // `/me` is the source of truth for the authenticated edit page.
    this.authService.getMe().subscribe();
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

  hasUnsavedChanges() {
    return (
      !!this.profileForm &&
      (this.profileForm.dirty || !!this.selectedAvatarFile() || !!this.selectedBannerFile())
    );
  }

  saveProfile() {
    if (this.profileForm.invalid) {
      this.toastService.show('Please fix the form errors', 'error');
      return;
    }
    this.isSaving.set(true);
    const avatarFile = this.selectedAvatarFile();
    const profileData = this.profileForm.value;
    const bannerFile = this.selectedBannerFile();
    let mediaUpload$ = of<PublicUserResponse | null>(null);
    if (avatarFile)
      mediaUpload$ = mediaUpload$.pipe(switchMap(() => this.authService.uploadAvatar(avatarFile)));
    if (bannerFile)
      mediaUpload$ = mediaUpload$.pipe(switchMap(() => this.authService.uploadBanner(bannerFile)));
    const save$ = mediaUpload$.pipe(
      switchMap((mediaProfile) =>
        this.userService.updateProfile(profileData).pipe(
          map((profile) => ({
            ...mediaProfile,
            ...profile,
            avatar_url: profile.avatar_url || mediaProfile?.avatar_url,
            banner_url: profile.banner_url || mediaProfile?.banner_url,
          })),
        ),
      ),
    );

    save$.subscribe({
      next: (profile) => {
        if (this.currentUser()) {
          this.authService.currentUser.set({
            ...this.currentUser()!,
            bio: profile.bio ?? profileData.bio,
            display_name: profile.display_name ?? profileData.display_name,
            instagram_url: profile.instagram_url ?? profileData.instagram_url,
            twitter_url: profile.twitter_url ?? profileData.twitter_url,
            youtube_url: profile.youtube_url ?? profileData.youtube_url,
            spotify_url: profile.spotify_url ?? profileData.spotify_url,
            avatar_url: resolveMediaUrl(profile.avatar_url || this.currentUser()!.avatar_url),
            banner_url: resolveMediaUrl(profile.banner_url || this.currentUser()!.banner_url),
          });
        }
        this.toastService.show('Profile updated successfully', 'success');
        this.selectedAvatarFile.set(null);
        this.avatarPreview.set(null);
        this.selectedBannerFile.set(null);
        this.bannerPreview.set(null);
        this.profileForm.markAsPristine();
        this.isSaving.set(false);
      },
      error: () => {
        this.toastService.show('Failed to update profile', 'error');
        this.isSaving.set(false);
      },
    });
  }

  discardProfileChanges() {
    const user = this.currentUser();
    if (user) {
      this.profileForm.patchValue({
        bio: user.bio || '',
        display_name: user.display_name || '',
        instagram_url: user.instagram_url || '',
        twitter_url: user.twitter_url || '',
        youtube_url: user.youtube_url || '',
        spotify_url: user.spotify_url || '',
      });
    }
    this.cancelAvatarUpload();
    this.selectedBannerFile.set(null);
    this.bannerPreview.set(null);
    this.profileForm.markAsPristine();
  }

  async onAvatarFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.show('File size must be less than 5MB', 'error');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        this.toastService.show('Please select a JPEG, PNG, or WebP image', 'error');
        return;
      }
      if (!(await this.hasImageShape(file, 'square'))) {
        this.toastService.show('Avatar image must be square', 'error');
        return;
      }
      this.selectedAvatarFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.avatarPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  onBannerFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.show('Banner must be less than 5MB', 'error');
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      this.toastService.show('Please select a JPEG, PNG, or WebP image', 'error');
      return;
    }
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      if (image.width <= image.height) {
        this.toastService.show('Banner image must be landscape', 'error');
        return;
      }
      this.selectedBannerFile.set(file);
      const reader = new FileReader();
      reader.onload = (e) => this.bannerPreview.set(e.target?.result as string);
      reader.readAsDataURL(file);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      this.toastService.show('Invalid banner image', 'error');
    };
    image.src = url;
  }

  private hasImageShape(file: File, shape: 'square' | 'landscape') {
    return new Promise<boolean>((resolve) => {
      const image = new Image();
      const url = URL.createObjectURL(file);
      image.onload = () => {
        resolve(shape === 'square' ? image.width === image.height : image.width > image.height);
        URL.revokeObjectURL(url);
      };
      image.onerror = () => {
        resolve(false);
        URL.revokeObjectURL(url);
      };
      image.src = url;
    });
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
