import { UserApiResponse } from '../../models';
import { ApiRequest, HttpMethod } from './api-request';

interface LoginResponse {
  token: string;
}

export class LoginRequest implements ApiRequest<LoginResponse> {
  readonly path = '/login';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: LoginResponse;
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
