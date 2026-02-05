import { User } from './user.model';
import { UserApiResponse } from './user-api.model';

export class UserAdapter {
  static toUser(apiResponse: UserApiResponse): User {
    return {
      id: apiResponse.id,
      email: apiResponse.email,
      name: apiResponse.name,
      role: apiResponse.role,
      bio: apiResponse.bio,
      instagram_url: apiResponse.instagram_url,
      twitter_url: apiResponse.twitter_url,
      youtube_url: apiResponse.youtube_url,
      spotify_url: apiResponse.spotify_url,
    };
  }
}
