import { Role } from './enums';

export interface User {
  id: string;
  email: string;
  name: string;
  display_name?: string | null;
  role: Role;
  email_verified?: boolean;
  bio?: string | null;
  avatar_url?: string | null;
  instagram_url?: string | null;
  twitter_url?: string | null;
  youtube_url?: string | null;
  spotify_url?: string | null;
  created_at: string;
  updated_at?: string;
}
