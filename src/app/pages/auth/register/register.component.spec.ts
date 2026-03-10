import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  const register = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { register } }],
    });
  });

  it('validates password mismatch and submits register payload', () => {
    const component = TestBed.runInInjectionContext(() => new RegisterComponent());
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);

    component.password = '123';
    component.confirmPassword = '456';
    component.onSubmit();
    expect(alertSpy).toHaveBeenCalledWith('PASSCODES DO NOT MATCH');

    component.username = 'u';
    component.displayName = 'dn';
    component.email = 'a@b.com';
    component.password = '12345678';
    component.confirmPassword = '12345678';
    component.role = 'producer';
    register.mockReturnValueOnce(of({}));
    component.onSubmit();
    expect(register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: '12345678',
      name: 'u',
      display_name: 'dn',
      role: 'producer',
    });

    register.mockReturnValueOnce(throwError(() => ({ error: { error: 'bad reg' } })));
    component.onSubmit();
    expect(alertSpy).toHaveBeenCalledWith('Registration failed: bad reg');

    component.displayName = '';
    register.mockReturnValueOnce(of({}));
    component.onSubmit();
    expect(register).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: '12345678',
      name: 'u',
      display_name: undefined,
      role: 'producer',
    });

    register.mockReturnValueOnce(throwError(() => ({})));
    component.onSubmit();
    expect(alertSpy).toHaveBeenCalledWith('Registration failed: Unknown error');
  });
});
