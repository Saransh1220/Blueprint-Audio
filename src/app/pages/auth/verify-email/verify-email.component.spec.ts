import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { VerifyEmailComponent } from './verify-email.component';

describe('VerifyEmailComponent', () => {
  const verifyEmail = vi.fn();
  const resendVerification = vi.fn();
  const show = vi.fn();
  const navigate = vi.fn();

  function create(params: Record<string, string> = {}) {
    TestBed.configureTestingModule({
      providers: [
        { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap(params)) } },
        { provide: Router, useValue: { navigate } },
        { provide: AuthService, useValue: { verifyEmail, resendVerification } },
        { provide: ToastService, useValue: { show } },
      ],
    });
    return TestBed.runInInjectionContext(() => new VerifyEmailComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    verifyEmail.mockReturnValue(of({}));
    resendVerification.mockReturnValue(of({}));
  });

  it('validates verification form', () => {
    const component = create();

    component.onVerifySubmit();

    expect(show).toHaveBeenCalledWith('Enter both email and verification code.', 'error');
    expect(verifyEmail).not.toHaveBeenCalled();
  });

  it('verifies email and navigates to login', () => {
    const component = create();
    component.email = 'a@b.com';
    component.code = '123456';

    component.onVerifySubmit();

    expect(verifyEmail).toHaveBeenCalledWith({ email: 'a@b.com', code: '123456' });
    expect(component.isSubmitting()).toBe(false);
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('auto-submits when route contains email and code', async () => {
    const component = create({ email: 'a@b.com', code: '123456' });

    component.ngOnInit();
    await Promise.resolve();

    expect(component.email).toBe('a@b.com');
    expect(verifyEmail).toHaveBeenCalledOnce();
  });

  it('handles verification and resend errors', () => {
    verifyEmail.mockReturnValueOnce(throwError(() => ({ error: { error: 'Bad code' } })));
    resendVerification.mockReturnValueOnce(throwError(() => ({ error: { error: 'Too soon' } })));
    const component = create();
    component.email = 'a@b.com';
    component.code = '123456';

    component.onVerifySubmit();
    expect(show).toHaveBeenCalledWith('Bad code', 'error');

    component.onResendCode();
    expect(show).toHaveBeenCalledWith('Too soon', 'error');
  });

  it('resends codes after validating email', () => {
    const component = create();

    component.onResendCode();
    expect(show).toHaveBeenCalledWith('Enter your email first.', 'error');

    component.email = 'a@b.com';
    component.onResendCode();
    expect(resendVerification).toHaveBeenCalledWith('a@b.com');
    expect(show).toHaveBeenCalledWith('A fresh verification code is on its way.', 'success');
  });
});
