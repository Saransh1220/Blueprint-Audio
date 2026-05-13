import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { ForgotPasswordComponent } from './forgot-password.component';

describe('ForgotPasswordComponent', () => {
  const forgotPassword = vi.fn();
  const show = vi.fn();
  const navigate = vi.fn();

  function create() {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { forgotPassword } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    TestBed.overrideProvider(Router, { useValue: { navigate } });
    return TestBed.runInInjectionContext(() => new ForgotPasswordComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    forgotPassword.mockReturnValue(of({}));
  });

  it('validates email before submitting', () => {
    const component = create();

    component.onSubmit();

    expect(show).toHaveBeenCalledWith('Enter the email for your account.', 'error');
    expect(forgotPassword).not.toHaveBeenCalled();
  });

  it('submits reset request and navigates with email', () => {
    const component = create();
    component.email = 'artist@example.com';

    component.onSubmit();

    expect(forgotPassword).toHaveBeenCalledWith('artist@example.com');
    expect(component.isSubmitting()).toBe(false);
    expect(show).toHaveBeenCalledWith(
      'If the account exists, a reset code has been sent.',
      'success',
    );
    expect(navigate).toHaveBeenCalledWith(['/reset-password'], {
      queryParams: { email: 'artist@example.com' },
    });
  });

  it('shows api error and clears submitting state', () => {
    forgotPassword.mockReturnValueOnce(throwError(() => ({ error: { error: 'Nope' } })));
    const component = create();
    component.email = 'missing@example.com';

    component.onSubmit();

    expect(component.isSubmitting()).toBe(false);
    expect(show).toHaveBeenCalledWith('Nope', 'error');
  });
});
