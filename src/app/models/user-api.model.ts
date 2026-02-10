import { Role } from './enums';

export interface UserApiResponse {
  id: string;
  email: string;
  name: string;
  display_name?: string;
  role: Role;
  bio?: string;
  avatar_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  created_at: string;
  updated_at: string;
}
