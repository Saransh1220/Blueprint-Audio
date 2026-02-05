import { ApiRequest, HttpMethod } from './api-request';

export interface UpdateProfileDto {
  bio?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
}

export interface PublicUserResponse {
  id: string;
  name: string;
  role: string;
  bio?: string;
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
