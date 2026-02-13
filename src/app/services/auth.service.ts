import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { LoginRequest, RegisterRequest, GetMeRequest } from '../core/api/auth.requests';
import {
  UpdateProfileRequest,
  UploadAvatarRequest,
  PublicUserResponse,
} from '../core/api/user.requests';
import { User, UserAdapter, Role } from '../models';
import { ModalService } from './modal.service';
import { AuthRequirementComponent } from '../components/modals/auth-requirement/auth-requirement.component';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  private modalService = inject(ModalService);

  currentUser = signal<User | null>(null);

  requireAuth(callback: () => void) {
    if (this.currentUser()) {
      callback();
    } else {
      this.modalService.open(AuthRequirementComponent, undefined, undefined, {
        width: '500px',
        height: 'auto',
      });
    }
  }

  constructor() {
    this.checkSession();
  }

  checkSession() {
    const token = localStorage.getItem('token');
    if (token) {
      this.getMe().subscribe();
    }
  }

  login(credentials: { email: string; password: string }) {
    return this.api.execute(new LoginRequest(credentials)).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        this.getMe().subscribe();
      }),
    );
  }

  register(data: {
    email: string;
    password: string;
    name: string;
    display_name?: string;
    role: string;
  }) {
    return this.api.execute(new RegisterRequest(data)).pipe(
      switchMap(() => {
        // Automatically login and return the login observable
        return this.login({ email: data.email, password: data.password });
      }),
    );
  }

  updateProfile(data: {
    bio?: string;
    display_name?: string;
    instagram_url?: string;
    twitter_url?: string;
    youtube_url?: string;
    spotify_url?: string;
  }) {
    return this.api.execute(new UpdateProfileRequest(data)).pipe(
      tap((updatedUser) => {
        this.currentUser.set(this.mapToUser(updatedUser));
      }),
    );
  }

  uploadAvatar(file: File) {
    return this.api.execute(new UploadAvatarRequest(file)).pipe(
      tap((updatedUser) => {
        this.currentUser.set(this.mapToUser(updatedUser));
      }),
    );
  }

  private mapToUser(response: PublicUserResponse): User {
    return {
      id: response.id,
      name: response.name,
      display_name: response.display_name || null,
      email: '', // Not included in public response
      role: response.role as Role,
      bio: response.bio || null,
      avatar_url: response.avatar_url || null,
      instagram_url: response.instagram_url || null,
      twitter_url: response.twitter_url || null,
      youtube_url: response.youtube_url || null,
      spotify_url: response.spotify_url || null,
      created_at: response.created_at,
    };
  }

  getMe() {
    return this.api.execute(new GetMeRequest()).pipe(
      map((apiResponse) => UserAdapter.toUser(apiResponse)),
      tap((user) => {
        this.currentUser.set(user);
      }),
      catchError((err) => {
        console.error('Error fetching user', err);
        this.logout();
        return of(null);
      }),
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
