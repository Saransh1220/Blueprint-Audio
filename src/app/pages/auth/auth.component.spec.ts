import { SocialAuthService } from '@abacritt/angularx-social-login';
import { Location } from '@angular/common';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { ToastService } from '../../services/toast.service';
import { AuthComponent } from './auth.component';

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
    expect(navigate).toHaveBeenCalledWith(['/verify-email'], {
      queryParams: { email: 'a@b.com' },
    });

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

  it('covers validation, helpers and edge branches', () => {
    const component = create('login');
    component.ngOnInit();
    expect(component.isLoginView).toBe(true);
    expect(component.pageTitle).toBe('Welcome back');
    expect(component.submitLabel).toBe('Sign In');
    expect(component.pageDescription).toContain('Access');
    expect(component.brandChips()[0].number).toBe('#0241');

    component.toggleView(true);
    expect(go).not.toHaveBeenCalled();
    component.toggleView(false);
    expect(go).toHaveBeenCalledWith('/register');
    expect(component.pageTitle).toBe('Create your account');
    expect(component.submitLabel).toBe('Create Account');
    expect(component.pageDescription).toContain('Set up');
    expect(component.brandChips()[0].number).toBe('SIDE B');

    component.registerUsername = 'u';
    component.registerDisplayName = 'dn';
    component.registerEmail = 'a@b.com';
    component.registerPassword = 'short';
    component.registerConfirmPassword = 'short';
    component.onRegisterSubmit();
    expect(show).toHaveBeenCalledWith('Password must be at least 8 characters', 'error');
    expect(register).not.toHaveBeenCalled();
  });

  it('computes password strength and match', () => {
    const component = create();
    expect(component.passwordStrength()).toEqual({ score: 0, label: '-' });
    component.registerPassword = 'abcdefgh';
    expect(component.passwordStrength().label).toBe('weak');
    component.registerPassword = 'abcdefghijkl';
    expect(component.passwordStrength().label).toBe('ok');
    component.registerPassword = 'Abcdefghijkl';
    expect(component.passwordStrength().label).toBe('good');
    component.registerPassword = 'Abcdefghijk1!';
    expect(component.passwordStrength()).toEqual({ score: 4, label: 'strong' });

    expect(component.passwordsMatch()).toBe(false);
    component.registerConfirmPassword = 'Abcdefghijk1!';
    expect(component.passwordsMatch()).toBe(true);
    component.registerConfirmPassword = 'x';
    expect(component.passwordsMatch()).toBe(false);
  });

  it('uses fallback messages and ignores tokenless google users', () => {
    const component = create();
    authState$.next(null);
    authState$.next({});
    expect(googleLogin).not.toHaveBeenCalled();

    googleLogin.mockReturnValueOnce(throwError(() => ({})));
    authState$.next({ idToken: 't' });
    expect(show).toHaveBeenCalledWith('Google Login failed: Unknown error', 'error');

    login.mockReturnValueOnce(throwError(() => ({})));
    component.loginEmail = 'a@b.com';
    component.loginPassword = 'pw';
    component.onLoginSubmit();
    expect(show).toHaveBeenCalledWith('Login failed: Invalid credentials', 'error');

    register.mockReturnValueOnce(throwError(() => ({})));
    component.registerUsername = 'u';
    component.registerDisplayName = 'dn';
    component.registerEmail = 'a@b.com';
    component.registerPassword = '12345678';
    component.registerConfirmPassword = '12345678';
    component.onRegisterSubmit();
    expect(show).toHaveBeenCalledWith('Registration failed: Unknown error', 'error');

    component.loginEmail = '';
    component.goToForgotPassword();
    expect(navigate).toHaveBeenCalledWith(['/forgot-password'], {
      queryParams: { email: undefined },
    });
    component.ngOnDestroy();
  });

  it('routes unverified logins into the verification screen and opens forgot-password flow', () => {
    const component = create();
    login.mockReturnValueOnce(throwError(() => ({ error: { error: 'email not verified' } })));
    component.loginEmail = 'u@test.com';
    component.loginPassword = 'secret';
    component.onLoginSubmit();

    expect(navigate).toHaveBeenCalledWith(['/verify-email'], {
      queryParams: { email: 'u@test.com' },
    });

    component.goToForgotPassword();
    expect(navigate).toHaveBeenCalledWith(['/forgot-password'], {
      queryParams: { email: 'u@test.com' },
    });
  });
});
