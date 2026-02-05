import { Component, OnInit, inject, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-profile',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.scss',
})
export class ProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private toastService = inject(ToastService);

  currentUser = this.authService.currentUser;
  profileForm!: FormGroup;

  isSaving = signal(false);

  constructor() {
    // Effect to watch currentUser signal and update form when data loads
    effect(() => {
      const user = this.currentUser();
      if (user && this.profileForm) {
        this.profileForm.patchValue({
          bio: user.bio || '',
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
}
