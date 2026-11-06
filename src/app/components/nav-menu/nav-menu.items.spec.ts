import { isFeatureAvailable } from '../../core/config/feature-availability';
import { BROWSE_ITEMS, menuItemsFor, STUDIO_ITEMS } from './nav-menu.items';

describe('nav menu items', () => {
  it('lists every destination once, with a route, an icon and a short line', () => {
    for (const items of [BROWSE_ITEMS, STUDIO_ITEMS]) {
      const routes = items.map((item) => item.route);
      expect(new Set(routes).size).toBe(routes.length);
      for (const item of items) {
        expect(item.route.startsWith('/')).toBe(true);
        expect(item.icon.startsWith('fa-')).toBe(true);
        expect(item.label).toBeTruthy();
        expect(item.description).toBeTruthy();
      }
    }
  });

  it('gives producers everything', () => {
    expect(menuItemsFor(BROWSE_ITEMS, true)).toEqual(
      BROWSE_ITEMS.filter((i) => isFeatureAvailable(i.route)),
    );
    expect(menuItemsFor(STUDIO_ITEMS, true)).toEqual(
      STUDIO_ITEMS.filter((i) => isFeatureAvailable(i.route)),
    );
  });

  it('hides the producer-only destinations from everyone else', () => {
    expect(menuItemsFor(BROWSE_ITEMS, false).map((item) => item.label)).toEqual(['Explore']);
    expect(menuItemsFor(STUDIO_ITEMS, false).map((item) => item.label)).toEqual([
      'Purchases',
      'Profile',
    ]);
  });
});
