import { HttpParams } from '@angular/common/http';
import { ApiRequest, HttpMethod } from './api-request';
import {
  Order,
  License,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
  LicenseDownloadsResponse,
  PaginatedResponse,
} from '../../models/payment';

// Get License Downloads Request
export class GetLicenseDownloadsRequest implements ApiRequest<LicenseDownloadsResponse> {
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: LicenseDownloadsResponse;
  readonly path: string;

  constructor(licenseId: string) {
    this.path = `/licenses/${licenseId}/downloads`;
  }
}

// Create Order Request
export class CreateOrderRequest implements ApiRequest<Order> {
  readonly path = '/orders';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: Order;

  constructor(
    public body: {
      spec_id: string;
      license_option_id: string;
    },
  ) { }
}

// Verify Payment Request
export class VerifyPaymentRequest implements ApiRequest<PaymentVerificationResponse> {
  readonly path = '/payments/verify';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: PaymentVerificationResponse;

  constructor(public body: PaymentVerificationRequest) { }
}

// Get Order Request
export class GetOrderRequest implements ApiRequest<Order> {
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: Order;

  constructor(id: string) {
    this.path = `/orders/${id}`;
  }

  readonly path: string;
}

// Get User Orders Request
export class GetUserOrdersRequest implements ApiRequest<Order[]> {
  readonly path = '/orders';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: Order[];
  readonly params?: HttpParams;

  constructor(queryParams?: { page?: number }) {
    if (queryParams) {
      let params = new HttpParams();
      if (queryParams.page) params = params.set('page', queryParams.page);
      this.params = params;
    }
  }
}

// Get User Licenses Request

// Get User Licenses Request

export class GetUserLicensesRequest implements ApiRequest<PaginatedResponse<License>> {
  readonly path = '/licenses';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: PaginatedResponse<License>;
  readonly params?: HttpParams;

  constructor(queryParams?: { page?: number; q?: string; type?: string }) {
    if (queryParams) {
      let params = new HttpParams();
      if (queryParams.page) params = params.set('page', queryParams.page);
      if (queryParams.q) params = params.set('q', queryParams.q);
      if (queryParams.type) params = params.set('type', queryParams.type);
      this.params = params;
    }
  }
}

// Get Producer Orders Request
export interface ProducerOrderDto {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  license_type: string;
  buyer_name: string;
  buyer_email: string;
  spec_title: string;
  razorpay_order_id?: string;
}

export interface ProducerOrderResponse {
  orders: ProducerOrderDto[];
  total: number;
  limit: number;
  offset: number;
}

export class GetProducerOrdersRequest implements ApiRequest<ProducerOrderResponse> {
  readonly path = '/orders/producer';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: ProducerOrderResponse;
  readonly params?: HttpParams;

  constructor(page: number = 1, limit: number = 10) {
    let params = new HttpParams().set('page', page);
    params = params.set('limit', limit);
    this.params = params;
  }
}
