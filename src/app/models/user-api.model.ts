export interface UserApiResponse {
  id: string;
  email: string;
  name: string;
  role: 'artist' | 'producer';
  bio?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
  created_at: string;
  updated_at: string;
}
