import {
  ForgotPasswordApiRequest,
  GetMeRequest,
  GoogleLoginRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationApiRequest,
  ResetPasswordApiRequest,
  VerifyEmailApiRequest,
} from './auth.requests';

describe('auth requests', () => {
  it('creates login request', () => {
    const body = { email: 'u@test.com', password: 'secret' };
    const req = new LoginRequest(body);

    expect(req.method).toBe('POST');
    expect(req.path).toBe('/login');
    expect(req.body).toEqual(body);
  });

  it('creates register request', () => {
    const body = { email: 'u@test.com', password: 'secret', name: 'User' };
    const req = new RegisterRequest(body);

    expect(req.method).toBe('POST');
    expect(req.path).toBe('/register');
    expect(req.body).toEqual(body);
  });

  it('creates get me request', () => {
    const req = new GetMeRequest();

    expect(req.method).toBe('GET');
    expect(req.path).toBe('/me');
  });

  it('creates google login request', () => {
    const req = new GoogleLoginRequest({ token: 'google-id-token' });

    expect(req.method).toBe('POST');
    expect(req.path).toBe('/auth/google');
    expect(req.body).toEqual({ token: 'google-id-token' });
  });

  it('creates email verification and recovery requests', () => {
    const verifyReq = new VerifyEmailApiRequest({ email: 'u@test.com', code: '123456' });
    const resendReq = new ResendVerificationApiRequest({ email: 'u@test.com' });
    const forgotReq = new ForgotPasswordApiRequest({ email: 'u@test.com' });
    const resetReq = new ResetPasswordApiRequest({
      email: 'u@test.com',
      code: '123456',
      new_password: 'newpassword123',
    });

    expect(verifyReq.path).toBe('/auth/verify-email');
    expect(resendReq.path).toBe('/auth/resend-verification');
    expect(forgotReq.path).toBe('/auth/forgot-password');
    expect(resetReq.path).toBe('/auth/reset-password');
  });
});
