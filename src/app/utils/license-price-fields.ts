import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import type { LicenseDto } from '../core/api/spec.requests';
import { minorToMajorString, parseMajorToMinor } from '../models/money';

export interface PriceInputPayload {
  currency: string;
  amount_minor: number;
  is_active?: boolean;
  revision?: number;
}

export function validatePriceInput(value: unknown, scale = 100): string | null {
  if (value === null || value === undefined || String(value).trim() === '') {
    return 'Price is required';
  }
  const minor = parseMajorToMinor(String(value), scale);
  if (Number.isNaN(minor)) {
    return 'Enter a valid positive number';
  }
  if (minor <= 0) {
    return 'Price must be greater than 0';
  }
  return null;
}

export function buildLicensePriceFormGroup(
  fb: FormBuilder,
  nativeCurrency: string,
  secondaryCurrency: string,
  initialPrices?: {
    nativePrice?: string | number | null;
    secondaryPrice?: string | number | null;
    sellNativeOnly?: boolean;
  },
): FormGroup {
  const nativeVal = initialPrices?.nativePrice != null ? String(initialPrices.nativePrice) : '';
  const secondaryVal =
    initialPrices?.secondaryPrice != null ? String(initialPrices.secondaryPrice) : '';
  const sellNativeOnly = !!initialPrices?.sellNativeOnly;
  const nativeMinor = parseMajorToMinor(nativeVal, 100);
  const secondaryMinor = parseMajorToMinor(secondaryVal, 100);

  return fb.group({
    nativePrice: [nativeVal, [Validators.required]],
    secondaryPrice: [secondaryVal],
    sellNativeOnly: [sellNativeOnly],
    nativeError: [null as string | null],
    secondaryError: [null as string | null],
    rateInfo: [null as string | null],
    isStale: [false],
    autoFilled: [false],
    autoFillLoading: [false],
    nativeRevision: [1],
    secondaryRevision: [1],
    originalNativeMinor: [Number.isNaN(nativeMinor) ? null : nativeMinor],
    originalSecondaryMinor: [Number.isNaN(secondaryMinor) ? null : secondaryMinor],
    originalSellNativeOnly: [sellNativeOnly],
  });
}

export function populateLicensePriceGroupFromDto(
  group: FormGroup,
  license: LicenseDto,
  nativeCurrency: string,
  secondaryCurrency: string,
): void {
  const prices = license.prices || [];
  const nativeEntry = prices.find(
    (p) => p.currency.toUpperCase() === nativeCurrency.toUpperCase(),
  );
  const secondaryEntry = prices.find(
    (p) => p.currency.toUpperCase() === secondaryCurrency.toUpperCase(),
  );

  let nativeMinor = nativeEntry?.amount_minor;
  let nativeRev = nativeEntry?.revision ?? 1;

  if (nativeMinor === undefined) {
    // Legacy fallback to scalar price
    nativeMinor = parseMajorToMinor(license.price, 100);
    nativeRev = 1;
  }

  let secondaryMinor = secondaryEntry?.amount_minor;
  const secondaryRev = secondaryEntry?.revision ?? 1;
  const sellNativeOnly = secondaryEntry ? !secondaryEntry.is_active : false;

  const nativeStr = nativeMinor !== undefined && !Number.isNaN(nativeMinor)
    ? minorToMajorString(nativeMinor, 100)
    : '';
  const secondaryStr = secondaryMinor !== undefined && !Number.isNaN(secondaryMinor)
    ? minorToMajorString(secondaryMinor, 100)
    : '';

  group.patchValue({
    nativePrice: nativeStr,
    secondaryPrice: secondaryStr,
    sellNativeOnly,
    nativeRevision: nativeRev,
    secondaryRevision: secondaryRev,
    originalNativeMinor: Number.isNaN(nativeMinor) ? null : nativeMinor,
    originalSecondaryMinor: secondaryMinor !== undefined && !Number.isNaN(secondaryMinor) ? secondaryMinor : null,
    originalSellNativeOnly: sellNativeOnly,
    nativeError: null,
    secondaryError: null,
    rateInfo: null,
    isStale: false,
    autoFilled: false,
    autoFillLoading: false,
  });
}

export function extractLicensePricePayload(
  group: FormGroup,
  nativeCurrency: string,
  secondaryCurrency: string,
  isEdit = false,
): PriceInputPayload[] {
  const val = group.getRawValue();
  const sellNativeOnly = !!val.sellNativeOnly;
  const nativeMinor = parseMajorToMinor(val.nativePrice, 100);
  const secondaryMinor = parseMajorToMinor(val.secondaryPrice, 100);

  if (!isEdit) {
    const list: PriceInputPayload[] = [];
    if (!Number.isNaN(nativeMinor)) {
      list.push({
        currency: nativeCurrency,
        amount_minor: nativeMinor,
        is_active: true,
      });
    }
    if (!Number.isNaN(secondaryMinor)) {
      list.push({
        currency: secondaryCurrency,
        amount_minor: secondaryMinor,
        is_active: !sellNativeOnly,
      });
    }
    return list;
  }

  // Edit mode: only include changed prices
  const patches: PriceInputPayload[] = [];
  const origNativeMinor = val.originalNativeMinor;
  const origSecondaryMinor = val.originalSecondaryMinor;
  const origSellNativeOnly = val.originalSellNativeOnly;

  if (!Number.isNaN(nativeMinor) && nativeMinor !== origNativeMinor) {
    patches.push({
      currency: nativeCurrency,
      amount_minor: nativeMinor,
      is_active: true,
      revision: val.nativeRevision,
    });
  }

  const secondaryActive = !sellNativeOnly;
  const origSecondaryActive = !origSellNativeOnly;
  const secondaryPriceChanged =
    !Number.isNaN(secondaryMinor) && secondaryMinor !== origSecondaryMinor;
  const secondaryActiveChanged = secondaryActive !== origSecondaryActive;

  if (secondaryPriceChanged || secondaryActiveChanged) {
    const amountMinor = !Number.isNaN(secondaryMinor)
      ? secondaryMinor
      : (origSecondaryMinor ?? 0);
    patches.push({
      currency: secondaryCurrency,
      amount_minor: amountMinor,
      is_active: secondaryActive,
      revision: val.secondaryRevision,
    });
  }

  return patches;
}
