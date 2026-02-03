import { ApiRequest, HttpMethod } from './api-request';
import { User } from '../../services/auth.service';

interface LoginResponse {
  token: string;
}

export class LoginRequest implements ApiRequest<LoginResponse> {
  readonly path = '/login';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: LoginResponse;
  constructor(public body: any) {}
}

export class RegisterRequest implements ApiRequest<User> {
  readonly path = '/register';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: User;
  constructor(public body: any) {}
}

export class GetMeRequest implements ApiRequest<User> {
  readonly path = '/me';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: User;
}
