import type { LicenseOption, Spec } from '../../models';

/** The license picked by default: the second tier when there is one, else the first. */
export function defaultLicense(spec: Spec | null | undefined): LicenseOption | null {
  return spec?.licenses?.[1] ?? spec?.licenses?.[0] ?? null;
}

export function licenseSubtitle(license: LicenseOption, index: number, total: number): string {
  if (license.type === 'Basic') return 'For demos and rough drafts';
  if (license.type === 'Premium') return 'For proper releases';
  if (license.type === 'Trackout') return 'For sessions that need stems';
  if (license.type === 'Unlimited')
    return total > 3 || index === total - 1 ? 'For bigger placements' : 'For wide release';
  return 'One-time license';
}

/** File types then features, de-duplicated, at most four. */
export function licenseFeatures(license: LicenseOption): string[] {
  const raw = [...(license.fileTypes ?? []), ...(license.features ?? [])]
    .map((item) => item?.trim())
    .filter((item): item is string => !!item);
  return Array.from(new Set(raw)).slice(0, 4);
}

export function formatLength(seconds?: number): string {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
