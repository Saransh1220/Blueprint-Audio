import { SocialAuthService } from '@abacritt/angularx-social-login';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthRequirementComponent } from '../components/modals/auth-requirement/auth-requirement.component';
import { ApiService } from '../core/services/api.service';
import { SessionStateService } from '../core/services/session-state.service';
import { Role } from '../models/enums';
import { AuthService } from './auth.service';
import { ModalService } from './modal.service';
import { TokenRefreshService } from './token-refresh.service';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(execute: ReturnType<typeof vi.fn>, skipInitialSessionCheck = true) {
    const navigate = vi.fn();
    const modalOpen = vi.fn();
    const signOut = vi.fn().mockResolvedValue(undefined);
    const refreshTokenWithQueue = vi.fn().mockReturnValue(of(undefined));
    const checkSessionSpy = skipInitialSessionCheck
      ? vi.spyOn(AuthService.prototype, 'checkSession').mockResolvedValue(null)
      : null;

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        SessionStateService,
        { provide: ApiService, useValue: { execute } },
        { provide: Router, useValue: { navigate } },
        { provide: ModalService, useValue: { open: modalOpen } },
        { provide: SocialAuthService, useValue: { signOut } },
        { provide: TokenRefreshService, useValue: { refreshTokenWithQueue } },
      ],
    });

    const service = TestBed.inject(AuthService);
    const sessionState = TestBed.inject(SessionStateService);
    checkSessionSpy?.mockRestore();

    return { service, sessionState, navigate, modalOpen, signOut, refreshTokenWithQueue };
  }

  it('login executes request and triggers getMe without storing token in localStorage', () => {
    const execute = vi.fn().mockReturnValue(of(undefined));
    const { service } = setup(execute);
    const getMeSpy = vi.spyOn(service, 'getMe').mockReturnValue(of(null));

    service.login({ email: 'u@test.com', password: 'pw' }).subscribe();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(getMeSpy).toHaveBeenCalledTimes(1);
  });

  it('register calls the api without auto-login', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service } = setup(execute);

    service
      .register({ email: 'u@test.com', password: 'pw', name: 'User', role: Role.ARTIST })
      .subscribe();

    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('exposes verification and password recovery helpers', () => {
    const execute = vi.fn().mockReturnValue(of({ message: 'ok' }));
    const { service } = setup(execute);

    service.verifyEmail({ email: 'u@test.com', code: '123456' }).subscribe();
    service.resendVerification('u@test.com').subscribe();
    service.forgotPassword('u@test.com').subscribe();
    service
      .resetPassword({ email: 'u@test.com', code: '123456', new_password: 'newpassword123' })
      .subscribe();

    expect(execute).toHaveBeenCalledTimes(4);
  });

  it('googleLogin executes request and triggers getMe without storing token in localStorage', () => {
    const execute = vi.fn().mockReturnValue(of(undefined));
    const { service } = setup(execute);
    const getMeSpy = vi.spyOn(service, 'getMe').mockReturnValue(of(null));

    service.googleLogin('google-id-token').subscribe();

    expect(execute).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem('token')).toBeNull();
    expect(getMeSpy).toHaveBeenCalledTimes(1);
  });

  it('checkSession restores user when /me succeeds', async () => {
    const execute = vi.fn().mockReturnValue(
      of({
        id: 'u1',
        email: 'u@test.com',
        name: 'Sam',
        role: Role.PRODUCER,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      }),
    );
    const { service, sessionState } = setup(execute, true);

    const user = await service.checkSession();
    expect(user?.id).toBe('u1');
    expect(sessionState.currentUser()?.name).toBe('Sam');
    expect(sessionState.status()).toBe('verified');
  });

  it('checkSession attempts silent refresh when /me returns 401', async () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(throwError(() => ({ status: 401 })))
      .mockReturnValueOnce(
        of({
          id: 'u2',
          email: 'u2@test.com',
          name: 'Alex',
          role: Role.PRODUCER,
          created_at: '2026-01-01',
          updated_at: '2026-01-02',
        }),
      );
    const { service, sessionState, refreshTokenWithQueue } = setup(execute, true);

    const user = await service.checkSession();
    expect(refreshTokenWithQueue).toHaveBeenCalledTimes(1);
    expect(user?.id).toBe('u2');
    expect(sessionState.currentUser()?.name).toBe('Alex');
    expect(sessionState.status()).toBe('verified');
  });

  it('checkSession sets anonymous when both /me and silent refresh fail', async () => {
    const execute = vi.fn().mockReturnValue(throwError(() => ({ status: 401 })));
    const { service, sessionState, refreshTokenWithQueue } = setup(execute, true);
    refreshTokenWithQueue.mockReturnValue(throwError(() => new Error('refresh failed')));

    const user = await service.checkSession();
    expect(user).toBeNull();
    expect(sessionState.currentUser()).toBeNull();
    expect(sessionState.status()).toBe('anonymous');
  });

  it('updateProfile and uploadAvatar update current user', () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(
        of({
          id: 'u1',
          name: 'Sam',
          role: Role.PRODUCER,
          bio: 'hello',
          avatar_url: null,
          created_at: '2026-01-01',
        }),
      )
      .mockReturnValueOnce(
        of({
          id: 'u1',
          name: 'Sam',
          role: Role.PRODUCER,
          bio: 'updated',
          avatar_url: 'avatar.png',
          created_at: '2026-01-01',
        }),
      );
    const { service } = setup(execute);

    service.updateProfile({ bio: 'hello' }).subscribe();
    expect(service.currentUser()?.bio).toBe('hello');

    const file = new File(['a'], 'avatar.png', { type: 'image/png' });
    service.uploadAvatar(file).subscribe();
    expect(service.currentUser()?.avatar_url).toBe('http://localhost:8080/avatar.png');
  });

  it('getMe maps user and stores it in session state', () => {
    const execute = vi.fn().mockReturnValue(
      of({
        id: 'u1',
        email: 'u@test.com',
        name: 'Sam',
        role: Role.PRODUCER,
        created_at: '2026-01-01',
        updated_at: '2026-01-02',
      }),
    );
    const { service, sessionState } = setup(execute);

    service.getMe().subscribe((user) => {
      expect(user?.email).toBe('u@test.com');
    });
    expect(sessionState.currentUser()?.name).toBe('Sam');
    expect(sessionState.isVerified()).toBe(true);
  });

  it('requireAuth executes callback when user is present', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service, sessionState, modalOpen } = setup(execute);
    const callback = vi.fn();

    sessionState.setVerified({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      status: 'active',
      email_verified: true,
      system_role: 0 as any,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    service.requireAuth(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(modalOpen).not.toHaveBeenCalled();
  });

  it('requireAuth opens auth requirement modal when user is missing', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service, sessionState, modalOpen } = setup(execute);
    const callback = vi.fn();
    sessionState.setAnonymous();

    service.requireAuth(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(modalOpen).toHaveBeenCalledWith(AuthRequirementComponent, undefined, undefined, {
      width: '440px',
      height: 'auto',
    });
  });

  it('logout cleans up local session and navigates to login', async () => {
    const execute = vi.fn().mockReturnValue(of(undefined));
    const { service, sessionState, navigate, signOut } = setup(execute);
    signOut.mockResolvedValueOnce(undefined);
    sessionState.setVerified({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      status: 'active',
      email_verified: true,
      system_role: 0 as any,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    service.logout();

    expect(sessionState.currentUser()).toBeNull();
    expect(sessionState.status()).toBe('anonymous');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('logout continues local cleanup even when the logout API call fails', () => {
    const execute = vi.fn().mockReturnValue(throwError(() => new Error('logout api failed')));
    const { service, sessionState, navigate } = setup(execute);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    sessionState.setVerified({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      status: 'active',
      email_verified: true,
      system_role: 0 as any,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    service.logout();

    expect(warnSpy).toHaveBeenCalled();
    expect(sessionState.currentUser()).toBeNull();
    expect(sessionState.status()).toBe('anonymous');
    expect(navigate).toHaveBeenCalledWith(['/login']);
    warnSpy.mockRestore();
  });
});
