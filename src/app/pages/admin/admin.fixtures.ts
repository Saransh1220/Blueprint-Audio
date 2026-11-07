import {
  AdminAuditEntry,
  AdminLicense,
  AdminOrder,
  AdminSpec,
  AdminUser,
  PaginatedResponse,
  SystemRole,
} from '../../models';

/** Test data shared by the admin specs. */
export function pageOf<T>(data: T[], total = data.length): PaginatedResponse<T> {
  return { data, metadata: { total, page: 1, per_page: 10 } };
}

export const user = (over: Partial<AdminUser> = {}): AdminUser => ({
  id: 'u1',
  email: 'ada@test.dev',
  name: 'Ada Lovelace',
  display_name: null,
  role: 'producer',
  system_role: SystemRole.USER,
  status: 'active',
  email_verified: true,
  created_at: '2026-01-02T10:00:00Z',
  ...over,
});

export const spec = (over: Partial<AdminSpec> = {}): AdminSpec => ({
  id: 's1',
  producer_id: 'u1',
  producer_email: 'ada@test.dev',
  producer_name: 'Ada Lovelace',
  title: 'Night Drive',
  category: 'beat',
  base_price: '29.99',
  processing_status: 'completed',
  is_deleted: false,
  created_at: '2026-01-02T10:00:00Z',
  ...over,
});

export const order = (over: Partial<AdminOrder> = {}): AdminOrder => ({
  id: 'o1abcdef12',
  user_id: 'u2',
  buyer_email: 'buyer@test.dev',
  spec_id: 's1',
  spec_title: 'Night Drive',
  license_type: 'Basic',
  amount: 150000,
  currency: 'INR',
  status: 'paid',
  created_at: '2026-01-03T10:00:00Z',
  ...over,
});

export const license = (over: Partial<AdminLicense> = {}): AdminLicense => ({
  id: 'l1abcdef12',
  user_id: 'u2',
  user_email: 'buyer@test.dev',
  spec_id: 's1',
  spec_title: 'Night Drive',
  license_type: 'Basic',
  purchase_price: 150000,
  is_active: true,
  is_revoked: false,
  downloads_count: 3,
  issued_at: '2026-01-03T10:00:00Z',
  ...over,
});

export const entry = (over: Partial<AdminAuditEntry> = {}): AdminAuditEntry => ({
  id: 'a1',
  actor_id: 'u9',
  actor_email: 'root@test.dev',
  action: 'users.set_status',
  resource_type: 'user',
  resource_id: 'abcdef1234567890',
  ip_address: '10.0.0.1',
  created_at: '2026-01-04T10:00:00Z',
  ...over,
});
