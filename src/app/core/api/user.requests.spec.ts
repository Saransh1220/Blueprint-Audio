import {
  GetPublicProfileRequest,
  UpdateProfileRequest,
  UploadAvatarRequest,
} from './user.requests';

describe('user requests', () => {
  it('creates update profile request', () => {
    const body = { bio: 'producer', instagram_url: 'https://ig.com/u' };
    const req = new UpdateProfileRequest(body);

    expect(req.method).toBe('PATCH');
    expect(req.path).toBe('/users/profile');
    expect(req.body).toEqual(body);
  });

  it('creates public profile request with user id path', () => {
    const req = new GetPublicProfileRequest('user-1');
    expect(req.method).toBe('GET');
    expect(req.path).toBe('/users/user-1/public');
  });

  it('creates avatar form-data payload', () => {
    const file = new File(['avatar-bytes'], 'avatar.png', { type: 'image/png' });
    const req = new UploadAvatarRequest(file);

    expect(req.method).toBe('POST');
    expect(req.path).toBe('/users/profile/avatar');
    expect(req.body.get('avatar')).toBe(file);
  });
});
