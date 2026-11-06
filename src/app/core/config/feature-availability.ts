import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Retain feature implementations and models while their data services are unfinished.
const UNRELEASED_ROUTES = [
  '/loops',
  '/sample-packs',
  '/battles',
  '/studio/earnings',
  '/studio/messages',
  '/studio/settings-studio',
];
export function isFeatureAvailable(route: string): boolean {
  return !UNRELEASED_ROUTES.some((path) => route === path || route.startsWith(path + '/'));
}
export const unreleasedFeatureGuard: CanActivateFn = (route) =>
  inject(Router).createUrlTree(['/unavailable'], {
    queryParams: { feature: route.data['feature'] || 'This feature' },
  });
