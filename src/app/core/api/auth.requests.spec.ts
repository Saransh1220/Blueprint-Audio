import { GetMeRequest, LoginRequest, RegisterRequest } from './auth.requests';

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
});
