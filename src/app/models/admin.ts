import type { SystemRole } from './enums';

export type AdminUserStatus = 'active' | 'suspended';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  display_name?: string | null;
  role: string;
  system_role: SystemRole;
  status: AdminUserStatus;
  email_verified: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminSpec {
  id: string;
  producer_id: string;
  producer_email: string;
  producer_name: string;
  title: string;
  category: string;
  base_price: number | string;
  processing_status: string;
  is_deleted: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  buyer_email: string;
  spec_id: string;
  spec_title: string;
  license_type: string;
  /** Minor units (paise or cents). */
  amount: number;
  currency: string;
  provider?: string;
  status: string;
  created_at: string;
}

export interface AdminLicense {
  id: string;
  user_id: string;
  user_email: string;
  spec_id: string;
  spec_title: string;
  license_type: string;
  /** Minor units. */
  purchase_price: number;
  is_active: boolean;
  is_revoked: boolean;
  downloads_count: number;
  issued_at: string;
}

export interface AdminAuditEntry {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  ip_address: string | null;
  created_at: string;
}

export interface AdminOverview {
  users?: number;
  producers?: number;
  specs?: number;
  orders?: number;
  paid_orders?: number;
  /** Minor units, summed across every currency. */
  revenue?: number;
}
