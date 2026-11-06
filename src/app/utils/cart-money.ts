import type { Money, SelectedPriceOffer } from '../models/money';

interface PricedItem {
  license?: { selectedPrice?: SelectedPriceOffer; displayPriceMoney?: Money };
}

/** One totals policy for both the cart service and the page. No major-unit or
 * default-currency fallback can turn an unknown total into a payable amount. */
export function summarizeCartMoney(items: readonly PricedItem[]) {
  let currency: string | undefined;
  let sum = 0;
  let mixed = false;
  let unavailable = false;
  for (const item of items) {
    const offer = item.license?.selectedPrice;
    const money = offer ?? item.license?.displayPriceMoney;
    if (offer && (!offer.is_purchasable || offer.selection === 'unavailable')) unavailable = true;
    if (
      !money ||
      !money.currency ||
      !Number.isSafeInteger(money.amount_minor) ||
      money.amount_minor < 0
    ) {
      unavailable = true;
      if (!money?.currency) mixed = true;
      continue;
    }
    if (currency && currency !== money.currency) mixed = true;
    currency ??= money.currency;
    sum += money.amount_minor;
    if (!Number.isSafeInteger(sum)) unavailable = true;
  }
  const totalMoney: Money | null =
    items.length && currency && !mixed && !unavailable ? { amount_minor: sum, currency } : null;
  return { hasMixedCurrencies: mixed, hasUnavailable: unavailable, totalMoney };
}
