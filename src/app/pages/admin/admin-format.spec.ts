import {
  actionIcon,
  actionLabel,
  errorMessage,
  formatDate,
  formatIp,
  formatMoney,
  formatNumber,
  hueFor,
  initials,
  label,
  licenseStatus,
  orderStatus,
  shortId,
  specStatus,
  toneIcon,
  userStatus,
} from './admin-format';

describe('admin formatting', () => {
  it('formats numbers and ids', () => {
    expect(formatNumber(1234)).toBe(new Intl.NumberFormat().format(1234));
    expect(formatNumber(undefined)).toBe('0');
    expect(shortId('abcdef1234567890')).toBe('abcdef12');
    expect(shortId(null)).toBe('');
  });

  it('formats minor-unit money for known, unknown and invalid currencies', () => {
    expect(formatMoney(150000, 'INR')).toContain('1,500.00');
    expect(formatMoney(2599, 'usd')).toContain('25.99');
    expect(formatMoney('1000', 'EUR')).toContain('10.00');
    expect(formatMoney(1000, 'NOPE')).toBe('—');
    expect(formatMoney(1234, 'JPY')).toContain('1,234');
    expect(formatMoney(undefined)).toContain('0.00');
  });

  it('formats dates and rejects bad ones', () => {
    expect(formatDate('2026-01-02T10:00:00Z')).toMatch(/2026/);
    expect(formatDate('not a date')).toBe('—');
    expect(formatDate(null)).toBe('—');
  });

  it('drops the netmask Postgres adds to a single host address', () => {
    expect(formatIp('10.0.0.1/32')).toBe('10.0.0.1');
    expect(formatIp('::1/128')).toBe('::1');
    expect(formatIp('10.0.0.0/24')).toBe('10.0.0.0/24');
    expect(formatIp('10.0.0.1')).toBe('10.0.0.1');
    expect(formatIp(null)).toBe('—');
    expect(formatIp('')).toBe('—');
  });

  it('builds initials from the best available name', () => {
    expect(initials({ display_name: null, name: 'Ada Lovelace', email: 'a@x.dev' })).toBe('AL');
    expect(initials({ display_name: 'Zed', name: 'Ignored', email: 'a@x.dev' })).toBe('ZE');
    expect(initials({ display_name: null, name: '', email: 'q@test.dev' })).toBe('Q@');
  });

  it('gives the same person the same avatar hue, always inside the colour wheel', () => {
    expect(hueFor('ada@test.dev')).toBe(hueFor('ada@test.dev'));
    expect(hueFor('ada@test.dev')).not.toBe(hueFor('zed@test.dev'));
    for (const seed of ['', 'a', 'a much longer seed value', null, undefined]) {
      const hue = hueFor(seed);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
    }
  });

  it('turns codes into readable labels', () => {
    expect(label('super_admin')).toBe('Super admin');
    expect(label('')).toBe('—');
    expect(label(null)).toBe('—');
    expect(actionLabel('users.set_status')).toBe('Changed account status');
    expect(actionLabel('users.set_system_role')).toBe('Changed system role');
    expect(actionLabel('specs.update')).toBe('Updated spec');
    expect(actionLabel('specs.delete')).toBe('Deleted spec');
    expect(actionLabel('specs.create')).toBe('Create');
  });

  it('picks an icon for each known audit action and a default for the rest', () => {
    expect(actionIcon('users.set_status')).toBe('fa-user-lock');
    expect(actionIcon('users.set_system_role')).toBe('fa-user-shield');
    expect(actionIcon('specs.update')).toBe('fa-pen-to-square');
    expect(actionIcon('specs.delete')).toBe('fa-trash');
    expect(actionIcon('something.else')).toBe('fa-clipboard-list');
  });

  it('maps users, orders, specs and licenses to a status and tone', () => {
    expect(userStatus({ status: 'active' })).toEqual({ text: 'Active', tone: 'ok' });
    expect(userStatus({ status: 'suspended' })).toEqual({ text: 'Suspended', tone: 'bad' });

    expect(orderStatus('paid')).toEqual({ text: 'Paid', tone: 'ok' });
    expect(orderStatus('pending').tone).toBe('warn');
    expect(orderStatus('processing').tone).toBe('warn');
    expect(orderStatus('failed').tone).toBe('bad');
    expect(orderStatus('cancelled').tone).toBe('bad');
    expect(orderStatus('refunded').tone).toBe('bad');
    expect(orderStatus('mystery')).toEqual({ text: 'Mystery', tone: 'muted' });

    expect(specStatus({ is_deleted: true, processing_status: 'completed' })).toEqual({
      text: 'Hidden',
      tone: 'muted',
    });
    expect(specStatus({ is_deleted: false, processing_status: 'completed' }).tone).toBe('ok');
    expect(specStatus({ is_deleted: false, processing_status: 'ready' }).tone).toBe('ok');
    expect(specStatus({ is_deleted: false, processing_status: 'failed' })).toEqual({
      text: 'Failed',
      tone: 'bad',
    });
    expect(specStatus({ is_deleted: false, processing_status: 'processing' })).toEqual({
      text: 'Processing',
      tone: 'warn',
    });

    expect(licenseStatus({ is_revoked: true, is_active: true })).toEqual({
      text: 'Revoked',
      tone: 'bad',
    });
    expect(licenseStatus({ is_revoked: false, is_active: true })).toEqual({
      text: 'Active',
      tone: 'ok',
    });
    expect(licenseStatus({ is_revoked: false, is_active: false })).toEqual({
      text: 'Inactive',
      tone: 'muted',
    });
  });

  it("uses the server's reason when it gives one, and a fallback otherwise", () => {
    expect(
      errorMessage({ error: { error: 'cannot remove the last super admin' } }, 'Fallback.'),
    ).toBe('Cannot remove the last super admin.');
    expect(errorMessage({ error: { error: 'Already a sentence.' } }, 'Fallback.')).toBe(
      'Already a sentence.',
    );
    expect(errorMessage(new Error('network'), 'Fallback.')).toBe('Fallback.');
    expect(errorMessage(null, 'Fallback.')).toBe('Fallback.');
    expect(errorMessage({ error: { error: '' } }, 'Fallback.')).toBe('Fallback.');
  });
});

describe('toneIcon', () => {
  it('hints at each tone with a simple icon', () => {
    expect(toneIcon('ok')).toBe('fa-check');
    expect(toneIcon('warn')).toBe('fa-clock');
    expect(toneIcon('bad')).toBe('fa-xmark');
    expect(toneIcon('muted')).toBe('fa-minus');
  });
});
