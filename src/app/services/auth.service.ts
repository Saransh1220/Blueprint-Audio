import { SocialAuthService } from '@abacritt/angularx-social-login';
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, firstValueFrom, map, of, switchMap, tap } from 'rxjs';
import { AuthRequirementComponent } from '../components/modals/auth-requirement/auth-requirement.component';
import {
  ForgotPasswordApiRequest,
  GetMeRequest,
  GoogleLoginRequest,
  LoginRequest,
  LogoutApiRequest,
  RegisterRequest,
  ResendVerificationApiRequest,
  ResetPasswordApiRequest,
  VerifyEmailApiRequest,
} from '../core/api/auth.requests';
import {
  PublicUserResponse,
  UpdateProfileRequest,
  UploadAvatarRequest,
  UploadBannerRequest,
} from '../core/api/user.requests';
import { ApiService } from '../core/services/api.service';
import { SessionStateService } from '../core/services/session-state.service';
import { Role, SystemRole, User, UserAdapter } from '../models';
import type { AppCurrency } from '../models/money';
import { resolveMediaUrl } from '../utils/media-url';
import { FavoriteStateService } from './favorite-state.service';
import { ModalService } from './modal.service';
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
  private readonly sessionState = inject(SessionStateService);
  private readonly favorites = inject(FavoriteStateService);

  private broadcastChannel: BroadcastChannel | null = null;

  readonly currentUser = this.sessionState.currentUser;

  constructor() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('waveyard_session');
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.type === 'logout') {
            this.clearLocalSession();
            this.router.navigate(['/login']);
          } else if (event.data?.type === 'login') {
            this.checkSession();
          }
        };
      } catch {
        /* Ignore environments without BroadcastChannel */
      }
    }
  }

  requireAuth(callback: () => void) {
    if (this.currentUser()) {
      callback();
    } else {
      this.modalService.open(AuthRequirementComponent, undefined, undefined, {
        width: '440px',
        height: 'auto',
      });
    }
  }

  readonly sessionReady = this.checkSession();

  /**
   * On app startup:
   * 1. Call /me using HttpOnly access cookie.
   * 2. On 401, attempt silent refresh using HttpOnly refresh cookie.
   *    If refresh succeeds -> call /me; if it fails -> leave as anonymous.
   */
  checkSession(): Promise<User | null> {
    return firstValueFrom(
      this.api.execute(new GetMeRequest()).pipe(
        map((apiResponse) => UserAdapter.toUser(apiResponse)),
        tap((user) => {
          this.favorites.setViewer(user.id);
          this.sessionState.setVerified(user);
        }),
        catchError((err) => {
          if (err?.status === 401) {
            // Attempt silent refresh via HttpOnly refresh cookie
            return this.tokenRefreshService.refreshTokenWithQueue().pipe(
              switchMap(() => this.getMe()),
              catchError(() => {
                this.sessionState.setAnonymous();
                return of(null);
              }),
            );
          }
          if (err?.status >= 500) {
            this.sessionState.setUnavailable();
          } else {
            this.sessionState.setAnonymous();
          }
          return of(null);
        }),
      ),
      { defaultValue: null },
    );
  }

  login(credentials: { email: string; password: string }) {
    return this.api.execute(new LoginRequest(credentials)).pipe(
      switchMap(() => this.getMe()),
      tap(() => {
        this.broadcastChannel?.postMessage({ type: 'login' });
      }),
    );
  }

  googleLogin(idToken: string) {
    return this.api.execute(new GoogleLoginRequest({ token: idToken })).pipe(
      switchMap(() => this.getMe()),
      tap(() => {
        this.broadcastChannel?.postMessage({ type: 'login' });
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
    return this.api.execute(new RegisterRequest(data));
  }

  verifyEmail(payload: { email: string; code: string }) {
    return this.api.execute(new VerifyEmailApiRequest(payload));
  }

  resendVerification(email: string) {
    return this.api.execute(new ResendVerificationApiRequest({ email }));
  }

  forgotPassword(email: string) {
    return this.api.execute(new ForgotPasswordApiRequest({ email }));
  }

  resetPassword(payload: { email: string; code: string; new_password: string }) {
    return this.api.execute(new ResetPasswordApiRequest(payload));
  }

  updateProfile(data: {
    bio?: string;
    display_name?: string;
    instagram_url?: string;
    twitter_url?: string;
    youtube_url?: string;
    spotify_url?: string;
    store_currency?: AppCurrency;
  }) {
    return this.api.execute(new UpdateProfileRequest(data)).pipe(
      tap((updatedUser) => {
        this.sessionState.currentUser.set(this.mapToUser(updatedUser));
      }),
    );
  }

  uploadAvatar(file: File) {
    return this.api.execute(new UploadAvatarRequest(file)).pipe(
      tap((updatedUser) => {
        this.sessionState.currentUser.set(this.mapToUser(updatedUser));
      }),
    );
  }

  uploadBanner(file: File) {
    return this.api
      .execute(new UploadBannerRequest(file))
      .pipe(tap((updatedUser) => this.sessionState.currentUser.set(this.mapToUser(updatedUser))));
  }

  private mapToUser(response: PublicUserResponse): User {
    return {
      id: response.id,
      name: response.name,
      display_name: response.display_name || null,
      email: '',
      role: response.role as Role,
      system_role: SystemRole.USER,
      status: 'active',
      email_verified: response.email_verified ?? true,
      bio: response.bio || null,
      avatar_url: resolveMediaUrl(response.avatar_url),
      banner_url: resolveMediaUrl(response.banner_url),
      instagram_url: response.instagram_url || null,
      twitter_url: response.twitter_url || null,
      youtube_url: response.youtube_url || null,
      spotify_url: response.spotify_url || null,
      store_currency: response.store_currency || undefined,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  }

  getMe() {
    return this.api.execute(new GetMeRequest()).pipe(
      map((apiResponse) => UserAdapter.toUser(apiResponse)),
      tap((user) => {
        this.favorites.setViewer(user.id);
        this.sessionState.setVerified(user);
      }),
      catchError((err) => {
        if (err?.status !== 401) {
          this.clearLocalSession();
        }
        return of(null);
      }),
    );
  }

  refreshToken() {
    return this.tokenRefreshService.refreshTokenWithQueue();
  }

  /** Clears local session without calling the API (used internally). */
  private clearLocalSession() {
    this.favorites.setViewer(undefined);
    try {
      localStorage.removeItem('token');
    } catch {
      /* ignore */
    }
    this.sessionState.setAnonymous();
  }

  logout() {
    this.api.execute(new LogoutApiRequest()).subscribe({
      next: () => {
        this.finalizeLogout();
      },
      error: (err) => {
        console.warn('Logout API failed, continuing local cleanup', err);
        this.finalizeLogout();
      },
    });
  }

  private finalizeLogout() {
    this.clearLocalSession();
    try {
      this.broadcastChannel?.postMessage({ type: 'logout' });
    } catch {
      /* ignore */
    }

    if (this.socialAuthService) {
      this.socialAuthService.signOut().catch((err) => {
        console.log('Google signout not required or failed', err);
      });
    }

    this.router.navigate(['/login']);
  }
}
