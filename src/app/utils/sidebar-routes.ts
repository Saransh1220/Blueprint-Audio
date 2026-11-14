/** Routes that render inside the left-sidebar app shell (browse / buy side of the app). */
const SIDEBAR_PREFIXES = [
  '/discover',
  '/explore',
  '/cart',
  '/beats',
  '/settings',
  '/dashboard',
  '/terms',
  '/privacy',
  '/licensing',
  '/@',
];

export function usesSidebarLayout(url: string): boolean {
  const path = url.split(/[?#]/, 1)[0];
  return SIDEBAR_PREFIXES.some((p) => path === p || path.startsWith(p.endsWith('@') ? p : `${p}/`));
}
