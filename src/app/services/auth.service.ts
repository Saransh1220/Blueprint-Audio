import { SocialAuthService } from '@abacritt/angularx-social-login';
import { DestroyRef, Injectable, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  EMPTY,
  catchError,
  defer,
  filter,
  firstValueFrom,
  map,
  of,
  switchMap,
  tap,
  throwError,
  timeout,
} from 'rxjs';
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
import { serializeSessionWrite } from './token-refresh.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly modalService = inject(ModalService);
  private readonly socialAuthService = inject(SocialAuthService);

  private readonly sessionState = inject(SessionStateService);
  private readonly favorites = inject(FavoriteStateService);

  private broadcastChannel: BroadcastChannel | null = null;

  readonly currentUser = this.sessionState.currentUser;
  readonly logoutStatus = this.sessionState.logoutStatus.asReadonly();
  readonly sessionReady: Promise<User | null>;

  constructor() {
    this.removeLegacyToken();
    effect(() => this.favorites.setViewer(this.sessionState.currentUserId() ?? undefined));
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.broadcastChannel = new BroadcastChannel('waveyard_session');
        this.broadcastChannel.onmessage = ({ data }) => {
          if (data?.type === 'logout' || data?.type === 'login') {
            if (this.logoutStatus() !== null) return;
            this.sessionState.setAnonymous();
            void this.checkSession();
          }
        };
      } catch {
        // Visibility revalidation still works without BroadcastChannel.
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible' && this.logoutStatus() === null) {
        void this.checkSession();
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    inject(DestroyRef).onDestroy(() => {
      this.broadcastChannel?.close();
      document.removeEventListener('visibilitychange', onVisible);
    });
    this.sessionReady = this.checkSession();
  }

  private removeLegacyToken() {
    try {
      localStorage.removeItem('token');
    } catch {
      // Storage can be disabled by browser policy.
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

  checkSession(): Promise<User | null> {
    if (this.logoutStatus() !== null) return Promise.resolve(null);
    const generation = this.sessionState.generation();
    return firstValueFrom(
      this.getMe().pipe(
        catchError((error) => {
          if (generation === this.sessionState.generation()) {
            if (error.status === 401 || error.status === 403) this.sessionState.setAnonymous();
            else this.sessionState.setUnavailable();
          }
          return of(null);
        }),
      ),
      { defaultValue: null },
    );
  }

  login(credentials: { email: string; password: string }) {
    return this.signIn(new LoginRequest(credentials));
  }

  googleLogin(idToken: string) {
    return this.signIn(new GoogleLoginRequest({ token: idToken }));
  }

  private signIn(request: LoginRequest | GoogleLoginRequest) {
    return defer(() => {
      if (this.logoutStatus() !== null) {
        return throwError(() => new Error('Complete sign-out before signing in.'));
      }
      this.sessionState.invalidate();
      const generation = this.sessionState.generation();
      const current = () =>
        generation === this.sessionState.generation() && this.logoutStatus() === null;
      return serializeSessionWrite(() => (current() ? this.api.execute(request) : EMPTY)).pipe(
        filter(current),
        switchMap((body) => {
          if (body != null)
            return throwError(() => new Error('The server did not return a cookie session.'));
          return this.getMe();
        }),
        tap((user) => {
          if (!user) throw new Error('Could not verify the signed-in session.');
          this.broadcastChannel?.postMessage({ type: 'login' });
        }),
      );
    });
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
    return this.updateViewer(new UpdateProfileRequest(data));
  }

  uploadAvatar(file: File) {
    return this.updateViewer(new UploadAvatarRequest(file));
  }

  uploadBanner(file: File) {
    return this.updateViewer(new UploadBannerRequest(file));
  }

  private updateViewer(request: UpdateProfileRequest | UploadAvatarRequest | UploadBannerRequest) {
    return defer(() => {
      const generation = this.sessionState.generation();
      return this.api.execute(request).pipe(
        filter(() => generation === this.sessionState.generation()),
        tap((response) => {
          const user = this.currentUser();
          if (!user || user.id !== response.id) return;
          const { email, system_role, status } = user;
          this.sessionState.currentUser.set({
            ...this.mapToUser(response),
            email,
            system_role,
            status,
          });
        }),
      );
    });
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
    return defer(() => {
      const generation = this.sessionState.generation();
      return this.api.execute(new GetMeRequest()).pipe(
        timeout(18000),
        filter(() => generation === this.sessionState.generation() && this.logoutStatus() === null),
        map((apiResponse) => UserAdapter.toUser(apiResponse)),
        tap((user) => this.sessionState.setVerified(user)),
      );
    });
  }

  logout() {
    if (this.logoutStatus() === 'pending') return;
    this.sessionState.logoutStatus.set('pending');
    this.sessionState.setAnonymous();
    serializeSessionWrite(() => this.api.execute(new LogoutApiRequest())).subscribe({
      next: (body) => {
        if (body != null) {
          this.sessionState.logoutStatus.set('failed');
          return;
        }
        this.sessionState.logoutStatus.set(null);
        this.removeLegacyToken();
        this.broadcastChannel?.postMessage({ type: 'logout' });
        this.socialAuthService?.signOut().catch(() => undefined);
        void this.router.navigate(['/login']);
      },
      error: () => this.sessionState.logoutStatus.set('failed'),
    });
  }
}
