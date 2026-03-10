import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import {
  LoginRequest,
  RegisterRequest,
  GetMeRequest,
  GoogleLoginRequest,
  RefreshRequest,
  LogoutApiRequest,
} from '../core/api/auth.requests';
import {
  UpdateProfileRequest,
  UploadAvatarRequest,
  PublicUserResponse,
} from '../core/api/user.requests';
import { User, UserAdapter, Role } from '../models';
import { ModalService } from './modal.service';
import { AuthRequirementComponent } from '../components/modals/auth-requirement/auth-requirement.component';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { TokenRefreshService } from './token-refresh.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly socialAuthService = inject(SocialAuthService);
  private readonly tokenRefreshService = inject(TokenRefreshService);

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

  /**
   * On app startup:
   * 1. If we have an access token → call /me to restore user state.
   * 2. If no access token → try to silently refresh using the HttpOnly cookie.
   *    If refresh succeeds → call /me; if it fails → leave unauthenticated.
   */
  checkSession() {
    const token = localStorage.getItem('token');
    if (token) {
      // We have a stored access token, verify it by fetching the user profile
      this.getMe().subscribe();
    } else {
      // No access token; attempt a silent refresh using the HttpOnly refresh cookie
      this.tokenRefreshService
        .refreshTokenWithQueue()
        .pipe(
          switchMap(() => this.getMe()),
          catchError(() => of(null)), // Refresh failed – user is not authenticated
        )
        .subscribe();
    }
  }

  login(credentials: { email: string; password: string }) {
    return this.api.execute(new LoginRequest(credentials)).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
      }),
      switchMap(() => this.getMe()),
    );
  }

  googleLogin(idToken: string) {
    return this.api.execute(new GoogleLoginRequest({ token: idToken })).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
      }),
      switchMap(() => this.getMe()),
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
        // Only clear state if it's not a 401 that the interceptor will handle
        if (err?.status !== 401) {
          this.clearLocalSession();
        }
        return of(null);
      }),
    );
  }

  /**
   * Called by the auth interceptor when a 401 is received.
   * Uses the HttpOnly refresh token cookie automatically via withCredentials.
   */
  refreshToken() {
    return this.api.execute(new RefreshRequest()).pipe(
      tap((res) => {
        if (res?.token) {
          localStorage.setItem('token', res.token);
        }
      }),
    );
  }

  /** Clears local session without calling the API (used internally). */
  private clearLocalSession() {
    localStorage.removeItem('token');
    this.currentUser.set(null);
  }

  logout() {
    // Call backend to revoke the session (clears the HttpOnly cookie server-side)
    this.api.execute(new LogoutApiRequest()).subscribe({
      error: (err) => console.warn('Logout API failed, continuing local logout', err),
    });

    this.clearLocalSession();

    // Sign out of Google to prevent auto-login loops
    if (this.socialAuthService) {
      this.socialAuthService.signOut().catch((err) => {
        console.log('Google signout not required or failed', err);
      });
    }

    this.router.navigate(['/login']);
  }
}
