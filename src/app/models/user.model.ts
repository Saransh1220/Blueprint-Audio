export interface User {
  id: string;
  email: string;
  name: string;
  role: 'artist' | 'producer';
  bio?: string;
  instagram_url?: string;
  twitter_url?: string;
  youtube_url?: string;
  spotify_url?: string;
}
