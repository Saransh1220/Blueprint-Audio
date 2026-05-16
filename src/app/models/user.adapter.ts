import { User } from './user.model';
import { UserApiResponse } from './user-api.model';
import { resolveMediaUrl } from '../utils/media-url';
import { SystemRole } from './enums';

export class UserAdapter {
  static toUser(apiResponse: UserApiResponse): User {
    return {
      id: apiResponse.id,
      email: apiResponse.email,
      name: apiResponse.name,
      display_name: apiResponse.display_name || null,
      role: apiResponse.role,
      system_role: apiResponse.system_role || SystemRole.USER,
      status: apiResponse.status || 'active',
      email_verified: apiResponse.email_verified ?? true,
      bio: apiResponse.bio || null,
      avatar_url: resolveMediaUrl(apiResponse.avatar_url),
      instagram_url: apiResponse.instagram_url || null,
      twitter_url: apiResponse.twitter_url || null,
      youtube_url: apiResponse.youtube_url || null,
      spotify_url: apiResponse.spotify_url || null,
      created_at: apiResponse.created_at || new Date().toISOString(),
      updated_at: apiResponse.updated_at,
    };
  }
}
