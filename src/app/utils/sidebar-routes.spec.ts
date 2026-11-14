import { describe, expect, it } from 'vitest';
import { usesSidebarLayout } from './sidebar-routes';

describe('usesSidebarLayout', () => {
  it.each([
    '/discover',
    '/explore',
    '/explore?sort=newest',
    '/cart',
    '/beats/abc',
    '/@producer',
    '/licensing',
  ])('uses the sidebar on %s', (url) => {
    expect(usesSidebarLayout(url)).toBe(true);
  });

  it.each(['/', '/login', '/studio/overview', '/upload', '/payment/return', '/exploreXYZ'])(
    'does not use the sidebar on %s',
    (url) => {
      expect(usesSidebarLayout(url)).toBe(false);
    },
  );
});
