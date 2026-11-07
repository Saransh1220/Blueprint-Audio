import type { AdminLicense, AdminSpec, AdminUser } from '../../models';
import { type CurrencyDefinition, DEFAULT_LEGACY_CURRENCY, formatMoneyValue } from '../../models/money';

/** How loudly a status badge speaks. */
export type Tone = 'ok' | 'warn' | 'bad' | 'muted';

export interface StatusView {
  text: string;
  tone: Tone;
}

export function formatNumber(value: number | null | undefined): string {
  return new Intl.NumberFormat().format(value ?? 0);
}

/** Amounts from the API are minor units (paise, cents). */
export function formatMoney(
  minor: number | string | null | undefined,
  currency?: string,
  definitions?: readonly CurrencyDefinition[],
): string {
  const targetCurrency = currency?.trim() || DEFAULT_LEGACY_CURRENCY;
  return formatMoneyValue(
    { amount_minor: Number(minor ?? 0), currency: targetCurrency },
    0,
    targetCurrency,
    definitions,
    {
      trailingZeros: true,
    },
  );
}

export function formatDate(value: string | null | undefined): string {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
    date,
  );
}

/** Postgres returns inet values with a netmask ("10.0.0.1/32"); a single host needs none. */
export function formatIp(value: string | null | undefined): string {
  if (!value) return '—';
  return value.replace(/\/(32|128)$/, '');
}

export function shortId(value: string | null | undefined): string {
  return String(value ?? '').slice(0, 8);
}

export function initials(user: Pick<AdminUser, 'display_name' | 'name' | 'email'>): string {
  const source = (user.display_name || user.name || user.email || '?').trim();
  const words = source.split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : source.slice(0, 2);
  return letters.toUpperCase();
}

/** A stable 0-359 hue for a string, so each person keeps the same avatar colour. */
export function hueFor(seed: string | null | undefined): number {
  let hash = 0;
  for (const char of String(seed ?? '')) {
    hash = (hash * 31 + char.charCodeAt(0)) % 360;
  }
  return hash;
}

/** "super_admin" -> "Super admin". */
export function label(value: string | null | undefined): string {
  const text = String(value ?? '')
    .replace(/_/g, ' ')
    .trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '—';
}

const ACTION_LABELS: Record<string, string> = {
  'users.set_status': 'Changed account status',
  'users.set_system_role': 'Changed system role',
  'specs.update': 'Updated spec',
  'specs.delete': 'Deleted spec',
};

/** "users.set_status" -> "Changed account status"; unknown actions fall back to their last word. */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? label(action.split('.').pop());
}

/** Font Awesome icon for an audit action. */
export function actionIcon(action: string): string {
  switch (action) {
    case 'users.set_status':
      return 'fa-user-lock';
    case 'users.set_system_role':
      return 'fa-user-shield';
    case 'specs.update':
      return 'fa-pen-to-square';
    case 'specs.delete':
      return 'fa-trash';
    default:
      return 'fa-clipboard-list';
  }
}

/** Font Awesome icon that hints at a status in a feed row. */
export function toneIcon(tone: Tone): string {
  switch (tone) {
    case 'ok':
      return 'fa-check';
    case 'warn':
      return 'fa-clock';
    case 'bad':
      return 'fa-xmark';
    default:
      return 'fa-minus';
  }
}

export function userStatus(user: Pick<AdminUser, 'status'>): StatusView {
  return user.status === 'active'
    ? { text: 'Active', tone: 'ok' }
    : { text: 'Suspended', tone: 'bad' };
}

export function orderStatus(status: string): StatusView {
  switch (status) {
    case 'paid':
      return { text: 'Paid', tone: 'ok' };
    case 'pending':
    case 'processing':
      return { text: label(status), tone: 'warn' };
    case 'failed':
    case 'cancelled':
    case 'refunded':
      return { text: label(status), tone: 'bad' };
    default:
      return { text: label(status), tone: 'muted' };
  }
}

export function specStatus(spec: Pick<AdminSpec, 'is_deleted' | 'processing_status'>): StatusView {
  if (spec.is_deleted) return { text: 'Hidden', tone: 'muted' };
  switch (spec.processing_status) {
    case 'completed':
    case 'ready':
      return { text: label(spec.processing_status), tone: 'ok' };
    case 'failed':
      return { text: 'Failed', tone: 'bad' };
    default:
      return { text: label(spec.processing_status), tone: 'warn' };
  }
}

export function licenseStatus(license: Pick<AdminLicense, 'is_revoked' | 'is_active'>): StatusView {
  if (license.is_revoked) return { text: 'Revoked', tone: 'bad' };
  return license.is_active ? { text: 'Active', tone: 'ok' } : { text: 'Inactive', tone: 'muted' };
}

/** The server's own explanation for a refusal, or a fallback sentence. */
export function errorMessage(err: unknown, fallback: string): string {
  const message = (err as { error?: { error?: unknown } })?.error?.error;
  if (typeof message !== 'string' || !message) return fallback;
  return label(message) + (message.endsWith('.') ? '' : '.');
}
