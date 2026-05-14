import { environment } from '../../environments/environment';

export function resolveMediaUrl(url?: string | null): string | null {
  const value = url?.trim();
  if (!value) return null;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;

  const baseUrl = environment.apiUrl.replace(/\/+$/, '');
  return value.startsWith('/') ? `${baseUrl}${value}` : `${baseUrl}/${value}`;
}
