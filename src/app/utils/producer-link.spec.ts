import { UrlSegment } from '@angular/router';
import { producerLink, profileUrlMatcher } from './producer-link';

describe('producer-link', () => {
  it('builds a single /@handle segment', () => {
    expect(producerLink('blaze')).toEqual(['/@blaze']);
    expect(producerLink('@blaze ')).toEqual(['/@blaze']);
    expect(producerLink(undefined)).toEqual(['/@producer']);
  });

  it('matches only a lone @handle segment', () => {
    const seg = (path: string) => new UrlSegment(path, {});
    expect(
      profileUrlMatcher([seg('@blaze')], null as never, null as never)?.posParams?.['handle'].path,
    ).toBe('blaze');
    expect(profileUrlMatcher([seg('blaze')], null as never, null as never)).toBeNull();
    expect(profileUrlMatcher([seg('@')], null as never, null as never)).toBeNull();
    expect(profileUrlMatcher([seg('@blaze'), seg('x')], null as never, null as never)).toBeNull();
  });
});
