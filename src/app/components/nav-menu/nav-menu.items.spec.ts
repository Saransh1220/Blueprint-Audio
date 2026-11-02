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
    expect(menuItemsFor(BROWSE_ITEMS, true)).toEqual(BROWSE_ITEMS);
    expect(menuItemsFor(STUDIO_ITEMS, true)).toEqual(STUDIO_ITEMS);
  });

  it('hides the producer-only destinations from everyone else', () => {
    expect(menuItemsFor(BROWSE_ITEMS, false).map((item) => item.label)).toEqual([
      'Explore',
      'Loops',
      'Sample packs',
      'Battles',
    ]);
    expect(menuItemsFor(STUDIO_ITEMS, false).map((item) => item.label)).toEqual([
      'Purchases',
      'Messages',
      'Profile',
    ]);
  });
});
