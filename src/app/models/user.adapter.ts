import { User } from './user.model';
import { UserApiResponse } from './user-api.model';

export class UserAdapter {
  static toUser(apiResponse: UserApiResponse): User {
    return {
      id: apiResponse.id,
      email: apiResponse.email,
      name: apiResponse.name,
      display_name: apiResponse.display_name || null,
      role: apiResponse.role,
      bio: apiResponse.bio || null,
      avatar_url: apiResponse.avatar_url || null,
      instagram_url: apiResponse.instagram_url || null,
      twitter_url: apiResponse.twitter_url || null,
      youtube_url: apiResponse.youtube_url || null,
      spotify_url: apiResponse.spotify_url || null,
      created_at: new Date().toISOString(), // Default to current date if not provided
    };
  }
}
