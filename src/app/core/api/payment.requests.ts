import { ApiRequest, HttpMethod } from './api-request';
import {
  Order,
  License,
  PaymentVerificationRequest,
  PaymentVerificationResponse,
} from '../../models/payment';

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
  ) {}
}

// Verify Payment Request
export class VerifyPaymentRequest implements ApiRequest<PaymentVerificationResponse> {
  readonly path = '/payments/verify';
  readonly method: HttpMethod = 'POST';
  readonly _responseType?: PaymentVerificationResponse;

  constructor(public body: PaymentVerificationRequest) {}
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

  constructor(public queryParams?: { page?: number }) {}
}

// Get User Licenses Request
export class GetUserLicensesRequest implements ApiRequest<License[]> {
  readonly path = '/licenses';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: License[];

  constructor(public queryParams?: { page?: number }) {}
}
