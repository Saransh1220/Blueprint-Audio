import { Role, SystemRole } from './enums';

export interface UserApiResponse {
  id: string;
  email: string;
  name: string;
  display_name?: string;
  role: Role;
  system_role?: SystemRole;
  status?: 'active' | 'suspended';
  email_verified?: boolean;
  bio?: string;
  avatar_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  created_at: string;
  updated_at: string;
}
