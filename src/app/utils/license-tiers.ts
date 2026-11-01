import type { LicenseOption } from '../models';

/** How a license is flagged next to its siblings. */
export type LicenseTier = 'popular' | 'highest' | 'standard';

type Named = Pick<LicenseOption, 'name' | 'type'>;

const nameOf = (license: Named) => `${license.name} ${license.type}`.toLowerCase();

/** An exclusive license takes the beat off the store; the label is the only signal we have. */
export function isExclusiveLicense(license: Named): boolean {
  return nameOf(license).includes('exclusive');
}

/**
 * Flags each license by its place in the list, so the buy dialog and the beat page always agree:
 *  - with two or more licenses, the Premium one (else the second) is the most popular;
 *  - with three or more, the last is the highest tier, unless that is already the popular one;
 *  - a license named "exclusive" is always the highest tier.
 */
export function licenseTiers(licenses: readonly Named[]): LicenseTier[] {
  const count = licenses.length;
  const tiers: LicenseTier[] = licenses.map(() => 'standard');
  if (count < 2) return tiers;

  const exclusive = licenses.findIndex(isExclusiveLicense);
  const premium = licenses.findIndex(
    (license, i) => i < count - 1 && i !== exclusive && /premium/.test(nameOf(license)),
  );
  // The fallback never lands on the exclusive license: that one is the highest tier, not a crowd pleaser.
  const popular = premium >= 0 ? premium : exclusive === 1 ? -1 : 1;
  if (popular >= 0) tiers[popular] = 'popular';

  const highest = exclusive >= 0 ? exclusive : count >= 3 ? count - 1 : -1;
  if (highest >= 0 && highest !== popular) tiers[highest] = 'highest';
  return tiers;
}

export const TIER_LABEL: Record<LicenseTier, string> = {
  popular: 'Most popular',
  highest: 'Highest tier',
  standard: '',
};

export const TIER_ICON: Record<LicenseTier, string> = {
  popular: 'fa-star',
  highest: 'fa-crown',
  standard: '',
};
