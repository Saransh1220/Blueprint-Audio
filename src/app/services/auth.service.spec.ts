import { of, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Role } from '../models/enums';
import { ApiService } from '../core/services/api.service';
import { AuthService } from './auth.service';
import { ModalService } from './modal.service';
import { AuthRequirementComponent } from '../components/modals/auth-requirement/auth-requirement.component';

describe('AuthService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function setup(execute: ReturnType<typeof vi.fn>) {
    const navigate = vi.fn();
    const modalOpen = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        { provide: ApiService, useValue: { execute } },
        { provide: Router, useValue: { navigate } },
        { provide: ModalService, useValue: { open: modalOpen } },
      ],
    });
    return { service: TestBed.inject(AuthService), navigate, modalOpen };
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

  it('getMe error logs out and returns null', () => {
    const execute = vi.fn().mockReturnValue(throwError(() => new Error('failed')));
    const { service, navigate } = setup(execute);
    localStorage.setItem('token', 'jwt-token');

    service.getMe().subscribe((user) => expect(user).toBeNull());

    expect(localStorage.getItem('token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
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
});
