import { ApiRequest, HttpMethod } from './api-request';

export interface UpdateProfileDto {
  bio?: string;
  display_name?: string;
  avatar_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
}

export interface PublicUserResponse {
  id: string;
  name: string;
  display_name?: string;
  role: string;
  bio?: string;
  avatar_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  created_at: string;
}

export class UpdateProfileRequest implements ApiRequest<PublicUserResponse> {
  readonly method: HttpMethod = 'PATCH';
  readonly path = '/users/profile';
  readonly body: UpdateProfileDto;
  readonly _responseType?: PublicUserResponse;

  constructor(data: UpdateProfileDto) {
    this.body = data;
  }
}

export class GetPublicProfileRequest implements ApiRequest<PublicUserResponse> {
  readonly method: HttpMethod = 'GET';
  readonly path: string;
  readonly _responseType?: PublicUserResponse;

  constructor(userId: string) {
    this.path = `/users/${userId}/public`;
  }
}

export class UploadAvatarRequest implements ApiRequest<PublicUserResponse> {
  readonly method: HttpMethod = 'POST';
  readonly path = '/users/profile/avatar';
  readonly body: FormData;
  readonly _responseType?: PublicUserResponse;

  constructor(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);
    this.body = formData;
  }
}
