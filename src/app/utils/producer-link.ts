import { type UrlMatcher, UrlSegment } from '@angular/router';

/** Public profile URLs look like /@blaze — one segment, `@` + the artist's unique handle. */
export const producerLink = (handle: string | null | undefined): string[] => [
  `/@${(handle || 'producer').trim().replace(/^@/, '')}`,
];

/** Matches a single `@handle` segment and exposes it as the `handle` param. */
export const profileUrlMatcher: UrlMatcher = (segments: UrlSegment[]) => {
  const first = segments[0];
  if (segments.length !== 1 || !first.path.startsWith('@') || first.path.length < 2) {
    return null;
  }
  return {
    consumed: segments,
    posParams: { handle: new UrlSegment(first.path.slice(1), {}) },
  };
};
