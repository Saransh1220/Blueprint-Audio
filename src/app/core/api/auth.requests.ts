import { UserApiResponse } from '../../models';
import { ApiRequest, HttpMethod } from './api-request';

export interface LoginResponse {
  token?: string;
}

interface AuthMessageResponse {
  message: string;
}

export class LoginRequest implements ApiRequest<void> {
  readonly path = '/login';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: void;
  constructor(public body: any) {}
}

export class RegisterRequest implements ApiRequest<UserApiResponse> {
  readonly path = '/register';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: UserApiResponse;
  constructor(
    public body: {
      email: string;
      password: string;
      name: string;
      display_name?: string;
      role: string;
    },
  ) {}
}

export class GetMeRequest implements ApiRequest<UserApiResponse> {
  readonly path = '/me';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: UserApiResponse;
}

export class GoogleLoginRequest implements ApiRequest<void> {
  readonly path = '/auth/google';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: void;

  constructor(public body: { token: string }) {}
}

export class RefreshRequest implements ApiRequest<void> {
  readonly path = '/auth/refresh';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: void;
}

export class LogoutApiRequest implements ApiRequest<void> {
  readonly path = '/auth/logout';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: void;
}

export class VerifyEmailApiRequest implements ApiRequest<AuthMessageResponse> {
  readonly path = '/auth/verify-email';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: AuthMessageResponse;

  constructor(public body: { email: string; code: string }) {}
}

export class ResendVerificationApiRequest implements ApiRequest<AuthMessageResponse> {
  readonly path = '/auth/resend-verification';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: AuthMessageResponse;

  constructor(public body: { email: string }) {}
}

export class ForgotPasswordApiRequest implements ApiRequest<AuthMessageResponse> {
  readonly path = '/auth/forgot-password';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: AuthMessageResponse;

  constructor(public body: { email: string }) {}
}

export class ResetPasswordApiRequest implements ApiRequest<AuthMessageResponse> {
  readonly path = '/auth/reset-password';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: AuthMessageResponse;

  constructor(
    public body: {
      email: string;
      code: string;
      new_password: string;
    },
  ) {}
}
