import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { SocialAuthService } from '@abacritt/angularx-social-login';
import { Role } from '../models/enums';
import { ApiService } from '../core/services/api.service';
import { AuthService } from './auth.service';
import { ModalService } from './modal.service';
import { AuthRequirementComponent } from '../components/modals/auth-requirement/auth-requirement.component';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(execute: ReturnType<typeof vi.fn>, skipInitialSessionCheck = true) {
    const navigate = vi.fn();
    const modalOpen = vi.fn();
    const signOut = vi.fn().mockResolvedValue(undefined);
    const checkSessionSpy = skipInitialSessionCheck
      ? vi.spyOn(AuthService.prototype, 'checkSession').mockImplementation(() => undefined)
      : null;

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: { execute } },
        { provide: Router, useValue: { navigate } },
        { provide: ModalService, useValue: { open: modalOpen } },
        { provide: SocialAuthService, useValue: { signOut } },
      ],
    });

    const service = TestBed.inject(AuthService);
    checkSessionSpy?.mockRestore();

    return { service, navigate, modalOpen, signOut };
  }

  it('login stores token and triggers getMe', () => {
    const execute = vi.fn().mockReturnValue(of({ token: 'jwt-token' }));
    const { service } = setup(execute);
    const getMeSpy = vi.spyOn(service, 'getMe').mockReturnValue(of(null));

    service.login({ email: 'u@test.com', password: 'pw' }).subscribe();

    expect(localStorage.getItem('token')).toBe('jwt-token');
    expect(getMeSpy).toHaveBeenCalledTimes(1);
  });

  it('register chains into login', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service } = setup(execute);
    const loginSpy = vi.spyOn(service, 'login').mockReturnValue(of({ token: 'x' } as never));

    service
      .register({ email: 'u@test.com', password: 'pw', name: 'User', role: Role.ARTIST })
      .subscribe();

    expect(loginSpy).toHaveBeenCalledWith({ email: 'u@test.com', password: 'pw' });
  });

  it('googleLogin stores token and triggers getMe', () => {
    const execute = vi.fn().mockReturnValue(of({ token: 'google-jwt' }));
    const { service } = setup(execute);
    const getMeSpy = vi.spyOn(service, 'getMe').mockReturnValue(of(null));

    service.googleLogin('google-id-token').subscribe();

    expect(localStorage.getItem('token')).toBe('google-jwt');
    expect(getMeSpy).toHaveBeenCalledTimes(1);
  });

  it('checkSession only calls getMe when token exists', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service } = setup(execute);
    const getMeSpy = vi.spyOn(service, 'getMe').mockReturnValue(of(null));
    const refreshTokenSpy = vi
      .spyOn(service, 'refreshToken')
      .mockReturnValue(of({ token: 'fresh-token' }));

    localStorage.removeItem('token');
    service.checkSession();
    expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
    expect(getMeSpy).toHaveBeenCalledTimes(1);

    getMeSpy.mockClear();
    refreshTokenSpy.mockClear();

    localStorage.setItem('token', 'jwt-token');
    service.checkSession();
    expect(getMeSpy).toHaveBeenCalledTimes(1);
    expect(refreshTokenSpy).not.toHaveBeenCalled();
  });

  it('checkSession ignores refresh failures when bootstrapping without a token', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service } = setup(execute);
    const getMeSpy = vi.spyOn(service, 'getMe').mockReturnValue(of(null));
    const refreshTokenSpy = vi
      .spyOn(service, 'refreshToken')
      .mockReturnValue(throwError(() => new Error('refresh failed')));

    localStorage.removeItem('token');
    service.checkSession();

    expect(refreshTokenSpy).toHaveBeenCalledTimes(1);
    expect(getMeSpy).not.toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
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
    expect(service.currentUser()?.avatar_url).toBe('avatar.png');
  });

  it('getMe maps user and stores it', () => {
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
    const { service } = setup(execute);

    service.getMe().subscribe((user) => {
      expect(user?.email).toBe('u@test.com');
    });
    expect(service.currentUser()?.name).toBe('Sam');
  });

  it('refreshToken stores new tokens and ignores empty refresh responses', () => {
    const execute = vi
      .fn()
      .mockReturnValueOnce(of({ token: 'fresh-token' }))
      .mockReturnValueOnce(of({}));
    const { service } = setup(execute);

    service.refreshToken().subscribe();
    expect(localStorage.getItem('token')).toBe('fresh-token');

    service.refreshToken().subscribe();
    expect(localStorage.getItem('token')).toBe('fresh-token');
  });

  it('getMe error logs out and returns null', async () => {
    const execute = vi.fn().mockReturnValue(throwError(() => new Error('failed')));
    const { service, navigate } = setup(execute);
    localStorage.setItem('token', 'jwt-token');
    service.currentUser.set({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    service.getMe().subscribe((user) => expect(user).toBeNull());
    await Promise.resolve();

    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('requireAuth executes callback when user is present', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service, modalOpen } = setup(execute);
    const callback = vi.fn();

    service.currentUser.set({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    service.requireAuth(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(modalOpen).not.toHaveBeenCalled();
  });

  it('requireAuth opens auth requirement modal when user is missing', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service, modalOpen } = setup(execute);
    const callback = vi.fn();
    service.currentUser.set(null);

    service.requireAuth(callback);

    expect(callback).not.toHaveBeenCalled();
    expect(modalOpen).toHaveBeenCalledWith(AuthRequirementComponent, undefined, undefined, {
      width: '500px',
      height: 'auto',
    });
  });

  it('logout continues even if social signout fails', async () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service, navigate, signOut } = setup(execute);
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    signOut.mockRejectedValueOnce(new Error('signout failed'));
    localStorage.setItem('token', 'jwt-token');
    service.currentUser.set({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    await service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(logSpy).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    logSpy.mockRestore();
  });

  it('logout clears local state even when the logout API call fails', () => {
    const execute = vi.fn().mockReturnValue(throwError(() => new Error('logout api failed')));
    const { service, navigate } = setup(execute);
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    localStorage.setItem('token', 'jwt-token');
    service.currentUser.set({
      id: 'u1',
      email: 'u@test.com',
      name: 'Sam',
      role: Role.PRODUCER,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
    });

    service.logout();

    expect(warnSpy).toHaveBeenCalled();
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
    warnSpy.mockRestore();
  });
});
