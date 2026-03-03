import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  const login = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { login } }],
    });
  });

  it('submits login payload and handles error alert', () => {
    const component = TestBed.runInInjectionContext(() => new LoginComponent());
    component.email = 'a@b.com';
    component.password = 'pw';

    login.mockReturnValueOnce(of({}));
    component.onSubmit();
    expect(login).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw' });

    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    login.mockReturnValueOnce(throwError(() => ({ error: { error: 'bad' } })));
    component.onSubmit();
    expect(alertSpy).toHaveBeenCalledWith('Login failed: bad');
    login.mockReturnValueOnce(throwError(() => ({})));
    component.onSubmit();
    expect(alertSpy).toHaveBeenCalledWith('Login failed: Invalid credentials');

    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    component.loginWithGoogle();
    expect(logSpy).toHaveBeenCalled();
  });
});
