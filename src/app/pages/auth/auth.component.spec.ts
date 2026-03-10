import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { AuthComponent } from './auth.component';
import { SocialAuthService } from '@abacritt/angularx-social-login';

describe('AuthComponent', () => {
  const authState$ = new Subject<any>();
  const navigate = vi.fn();
  const go = vi.fn();
  const login = vi.fn();
  const register = vi.fn();
  const googleLogin = vi.fn();
  const show = vi.fn();

  function create(path = 'login') {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { url: [{ path }] } },
        },
        { provide: Router, useValue: { navigate } },
        { provide: Location, useValue: { go } },
        { provide: AuthService, useValue: { login, register, googleLogin } },
        { provide: ThemeService, useValue: { activeTheme: signal('vampire') } },
        { provide: ToastService, useValue: { show } },
        { provide: SocialAuthService, useValue: { authState: authState$ } },
      ],
    });
    return TestBed.runInInjectionContext(() => new AuthComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    login.mockReturnValue(of({}));
    register.mockReturnValue(of({}));
    googleLogin.mockReturnValue(of({}));
  });

  it('handles init/toggle and login submit flows', () => {
    const component = create('register');
    component.ngOnInit();
    expect(component.isLoginView).toBe(false);

    component.toggleView(true);
    expect(component.isLoginView).toBe(true);
    expect(go).toHaveBeenCalledWith('/login');

    component.onLoginSubmit();
    expect(show).toHaveBeenCalledWith('Please enter email and password', 'error');

    component.loginEmail = 'a@b.com';
    component.loginPassword = 'pw';
    component.onLoginSubmit();
    expect(login).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('handles login and register errors/validation', () => {
    const component = create();
    login.mockReturnValueOnce(throwError(() => ({ error: { error: 'bad login' } })));
    component.loginEmail = 'a@b.com';
    component.loginPassword = 'pw';
    component.onLoginSubmit();
    expect(show).toHaveBeenCalledWith('Login failed: bad login', 'error');

    component.onRegisterSubmit();
    expect(show).toHaveBeenCalledWith('Please fill in all fields', 'error');

    component.registerUsername = 'u';
    component.registerDisplayName = 'dn';
    component.registerEmail = 'a@b.com';
    component.registerPassword = '12345678';
    component.registerConfirmPassword = '1234';
    component.onRegisterSubmit();
    expect(show).toHaveBeenCalledWith('Passwords do not match', 'error');

    component.registerConfirmPassword = '1234567';
    component.onRegisterSubmit();
    expect(show).toHaveBeenCalledWith('Passwords do not match', 'error');
  });

  it('handles register success/error and google auth subscription', () => {
    const component = create();
    component.registerUsername = 'u';
    component.registerDisplayName = 'dn';
    component.registerEmail = 'a@b.com';
    component.registerPassword = '12345678';
    component.registerConfirmPassword = '12345678';
    component.registerRole = 'producer';
    component.onRegisterSubmit();
    expect(register).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);

    register.mockReturnValueOnce(throwError(() => ({ error: { error: 'bad reg' } })));
    component.isLoginView = false;
    component.onRegisterSubmit();
    expect(show).toHaveBeenCalledWith('Registration failed: bad reg', 'error');

    authState$.next({ idToken: 'id-1' });
    expect(googleLogin).toHaveBeenCalledWith('id-1');
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);

    googleLogin.mockReturnValueOnce(throwError(() => ({ error: { error: 'gfail' } })));
    authState$.next({ idToken: 'id-2' });
    expect(show).toHaveBeenCalledWith('Google Login failed: gfail', 'error');

    component.ngOnDestroy();
  });
});
