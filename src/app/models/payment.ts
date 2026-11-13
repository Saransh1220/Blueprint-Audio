// Order model - matches backend response
export interface Order {
  id: string;
  user_id: string;
  spec_id: string;
  license_type: string;
  amount: number; // in paise
  currency: string;
  razorpay_order_id: string | null;
  provider?: 'razorpay' | 'dodo' | string;
  provider_checkout_id?: string | null;
  provider_payment_id?: string | null;
  checkout_url?: string | null;
  status: OrderStatus;
  notes: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';

export interface OrderLicenseSummary {
  id: string;
  license_key: string;
}

export interface OrderStatusDto {
  order_id: string;
  status: OrderStatus;
  provider: string;
  expires_at: string;
  license?: OrderLicenseSummary | null;
  retry_after_seconds: number;
}

// License model - matches backend response
export interface License {
  id: string;
  order_id: string;
  user_id: string;
  spec_id: string;
  license_option_id: string;
  license_type: string;
  purchase_price: number; // in paise
  currency?: string;
  license_key: string;
  is_active: boolean;
  is_revoked: boolean;
  revoked_reason?: string | null;
  revoked_at?: string | null;
  downloads_count: number;
  last_downloaded_at?: string | null;
  issued_at: string;
  created_at: string;
  updated_at: string;
  spec_title?: string;
  spec_image?: string;
}

// Razorpay Checkout options
export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
}

// Razorpay success response
export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// Payment verification request
export interface PaymentVerificationRequest {
  order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

// Payment verification response
export interface PaymentVerificationResponse {
  success: boolean;
  license: License;
  message: string;
}

export interface LicenseDownloadsResponse {
  license_id: string;
  license_type: string;
  spec_title: string;
  expires_in: number;
  mp3_url?: string;
  wav_url?: string;
  stems_url?: string;
}

// Declare Razorpay global (from SDK script)
declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaginationMetadata {
  total: number;
  page: number;
  per_page: number;
  limit?: number;
  offset?: number;
  total_pages?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMetadata;
}

export interface OrderRefund {
  id: string;
  order_id: string;
  payment_id: string;
  user_id: string;
  admin_id: string;
  idempotency_key: string;
  amount: number;
  currency: string;
  provider: string;
  provider_refund_id?: string | null;
  provider_payment_id: string;
  reason: string;
  notes?: string | null;
  status: 'requested' | 'submitting' | 'pending' | 'succeeded' | 'failed' | 'needs_review' | string;
  created_at: string;
  updated_at: string;
}

export interface CreateRefundPayload {
  reason: string;
  notes?: string;
}

export interface OrderRefundResponse {
  id: string;
  order_id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string;
  provider_refund_id?: string | null;
  created_at: string;
}
