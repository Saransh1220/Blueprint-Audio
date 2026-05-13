import { convertToParamMap, ActivatedRoute, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ResetPasswordComponent } from './reset-password.component';

describe('ResetPasswordComponent', () => {
  const resetPassword = vi.fn();
  const show = vi.fn();
  const navigate = vi.fn();

  function create(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { resetPassword } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    return TestBed.runInInjectionContext(() => new ResetPasswordComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    resetPassword.mockReturnValue(of({}));
  });

  it('loads query params into the form', () => {
    const component = create({ email: 'a@b.com', code: '123456' });

    component.ngOnInit();

    expect(component.email).toBe('a@b.com');
    expect(component.code).toBe('123456');
  });

  it('validates required fields, matching passwords, and length', () => {
    const component = create();

    component.onSubmit();
    expect(show).toHaveBeenLastCalledWith('Fill in every field to finish the reset.', 'error');

    component.email = 'a@b.com';
    component.code = '123456';
    component.newPassword = 'password1';
    component.confirmPassword = 'password2';
    component.onSubmit();
    expect(show).toHaveBeenLastCalledWith('Passwords do not match.', 'error');

    component.confirmPassword = 'short';
    component.newPassword = 'short';
    component.onSubmit();
    expect(show).toHaveBeenLastCalledWith('Password must be at least 8 characters.', 'error');
  });

  it('resets password and navigates to login', () => {
    const component = create();
    component.email = 'a@b.com';
    component.code = '123456';
    component.newPassword = 'longpass';
    component.confirmPassword = 'longpass';

    component.onSubmit();

    expect(resetPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      code: '123456',
      new_password: 'longpass',
    });
    expect(component.isSubmitting()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('surfaces reset errors', () => {
    resetPassword.mockReturnValueOnce(throwError(() => ({ error: { error: 'Expired' } })));
    const component = create();
    component.email = 'a@b.com';
    component.code = '123456';
    component.newPassword = 'longpass';
    component.confirmPassword = 'longpass';

    component.onSubmit();

    expect(component.isSubmitting()).toBe(false);
    expect(show).toHaveBeenCalledWith('Expired', 'error');
  });
});
