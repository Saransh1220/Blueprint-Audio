// Order model - matches backend response
export interface Order {
  id: string;
  user_id: string;
  spec_id: string;
  license_type: string;
  amount: number; // in paise
  currency: string;
  razorpay_order_id: string | null;
  status: OrderStatus;
  notes: Record<string, any>;
  created_at: string;
  updated_at: string;
  expires_at: string;
}

export type OrderStatus = 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled' | 'refunded';

// License model - matches backend response
export interface License {
  id: string;
  order_id: string;
  user_id: string;
  spec_id: string;
  license_option_id: string;
  license_type: string;
  purchase_price: number; // in paise
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
}

export interface PaginatedResponse<T> {
  data: T[];
  metadata: PaginationMetadata;
}
