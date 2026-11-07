import { BRAND } from '../core/config/brand';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, defer, EMPTY, expand, map, Observable, of, switchMap, tap, throwError, timer } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CreateOrderBody,
  CreateOrderRequest,
  GetLicenseDownloadsRequest,
  GetOrderStatusRequest,
  GetProducerOrdersRequest,
  GetUserLicensesRequest,
  ProducerOrderResponse,
  VerifyPaymentRequest,
} from '../core/api/payment.requests';
import { ApiService } from '../core/services/api.service';
import type { Money, SelectedPriceOffer } from '../models/money';
import {
  License,
  LicenseDownloadsResponse,
  Order,
  OrderStatusDto,
  PaginationMetadata,
  PaymentVerificationRequest,
  RazorpayOptions,
  RazorpayResponse,
} from '../models/payment';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

@Injectable({
  providedIn: 'root',
})
export class PaymentService {
  private api = inject(ApiService);
  private toast = inject(ToastService);
  private auth = inject(AuthService);
  private router = inject(Router);

  // Track active licenses
  // Track active licenses - moved down to keep together with pagination
  // userLicenses = signal<License[]>([]);

  /**
   * Create an order and open checkout with explicit evidence
   */
  initiatePayment(
    specId: string,
    licenseOptionId: string,
    specTitle: string,
    evidence?: {
      selectedPrice?: SelectedPriceOffer;
      displayPriceMoney?: Money;
      priceMoney?: Money;
    },
  ): Observable<Order> {
    const body: CreateOrderBody = {
      spec_id: specId,
      license_option_id: licenseOptionId,
    };

    if (evidence?.selectedPrice) {
      body.currency = evidence.selectedPrice.currency;
      body.expected_price_id = evidence.selectedPrice.price_id;
      body.expected_revision = evidence.selectedPrice.revision;
      body.expected_amount_minor = evidence.selectedPrice.amount_minor;
      body.expected_currency = evidence.selectedPrice.currency;
    } else if (evidence?.displayPriceMoney) {
      body.currency = evidence.displayPriceMoney.currency;
      body.expected_amount_minor = evidence.displayPriceMoney.amount_minor;
      body.expected_currency = evidence.displayPriceMoney.currency;
    }

    // Step 1: Create order on backend
    return this.api.execute(new CreateOrderRequest(body)).pipe(
      tap((order) => {
        if (order.provider === 'dodo' && order.checkout_url) {
          window.location.assign(order.checkout_url);
          return;
        }
        this.openRazorpayCheckout(order, specTitle);
      }),
      catchError((error) => {
        if (error?.status === 409 || error?.error?.code === 'PRICE_CHANGED') {
          this.toast.show('Price changed. Please review the updated offer.', 'info');
        } else {
          this.toast.show('Failed to create order. Please try again.', 'error');
        }
        return throwError(() => error);
      }),
    );
  }

  /**
   * Open Razorpay checkout modal
   */
  private openRazorpayCheckout(order: Order, specTitle: string): void {
    if (typeof window === 'undefined' || typeof (window as any).Razorpay === 'undefined') {
      this.toast.show('Razorpay SDK failed to load. Please check your connection and try again.', 'error');
      return;
    }

    const user = this.auth.currentUser();

    const options: RazorpayOptions = {
      key: environment.razorpayKeyId,
      amount: order.amount,
      currency: order.currency,
      name: BRAND.name,
      description: `Purchase ${specTitle}`,
      order_id: order.razorpay_order_id!,
      prefill: {
        name: user?.name || '',
        email: user?.email || '',
      },
      theme: {
        color: '#6366f1',
      },
      handler: (response: RazorpayResponse) => {
        this.handlePaymentSuccess(order.id, response);
      },
      modal: {
        ondismiss: () => {
          this.toast.show('Payment cancelled', 'info');
        },
      },
    };

    const razorpay = new window.Razorpay(options);
    razorpay.open();
  }

  /**
   * Handle successful payment from Razorpay
   */
  private handlePaymentSuccess(orderId: string, response: RazorpayResponse): void {
    const verificationData: PaymentVerificationRequest = {
      order_id: orderId,
      razorpay_payment_id: response.razorpay_payment_id,
      razorpay_signature: response.razorpay_signature,
    };

    // Fast-path client verification, always route to payment return page
    this.api
      .execute(new VerifyPaymentRequest(verificationData))
      .pipe(
        tap(() => {
          this.fetchUserLicenses().subscribe();
        }),
        catchError(() => {
          // If fast-path returns error or hangs, return page polling and webhook will resolve it
          return of(null);
        }),
      )
      .subscribe(() => {
        this.router.navigate(['/payment/return'], { queryParams: { order_id: orderId } });
      });
  }

  /**
   * Get single order status snapshot
   */
  getOrderStatus(orderId: string): Observable<OrderStatusDto> {
    return this.api.execute(new GetOrderStatusRequest(orderId));
  }

  /**
   * Poll order status until terminal status or timeout (easing interval, capped at 90s)
   */
  pollOrderStatus(orderId: string, maxDurationMs: number = 90000): Observable<OrderStatusDto> {
    const startTime = Date.now();
    let currentDelayMs = 2000;

    return defer(() => this.getOrderStatus(orderId)).pipe(
      expand((status) => {
        const elapsed = Date.now() - startTime;
        const terminalStatuses: string[] = ['paid', 'failed', 'cancelled', 'refunded'];
        if (terminalStatuses.includes(status.status) || elapsed >= maxDurationMs) {
          return EMPTY;
        }

        const delayMs =
          status.retry_after_seconds > 0
            ? status.retry_after_seconds * 1000
            : Math.min(currentDelayMs * 1.5, 5000);
        currentDelayMs = delayMs;

        return timer(delayMs).pipe(switchMap(() => this.getOrderStatus(orderId)));
      }),
    );
  }

  // Track active licenses and pagination
  userLicenses = signal<License[]>([]);
  licensePagination = signal<PaginationMetadata | null>(null);

  /**
   * Fetch user's licenses
   */
  fetchUserLicenses(
    page: number = 1,
    limit: number = 8,
    search?: string,
    licenseType?: string,
  ): Observable<License[]> {
    const params: any = { page, limit };
    if (search) params.q = search;
    if (licenseType && licenseType !== 'ALL') params.type = licenseType; // Handle 'ALL' case

    return this.api.execute(new GetUserLicensesRequest(params)).pipe(
      tap((response: any) => {
        // Handle both new paginated response and old flat array for robustness
        const data = response?.data || (Array.isArray(response) ? response : []);
        const metadata = response?.metadata || null;

        this.userLicenses.set(data);
        this.licensePagination.set(metadata);
      }),
      map((response: any) => response?.data || (Array.isArray(response) ? response : [])),
      catchError((error) => {
        console.error('Failed to fetch licenses', error);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Check if user has purchased a license for a spec
   */
  hasLicenseForSpec(specId: string): boolean {
    return this.userLicenses().some(
      (license) => license.spec_id === specId && license.is_active && !license.is_revoked,
    );
  }

  /**
   * Get download URLs for a license
   */
  getLicenseDownloads(licenseId: string): Observable<LicenseDownloadsResponse> {
    return this.api.execute(new GetLicenseDownloadsRequest(licenseId));
  }

  /**
   * Get orders for producer (sales)
   */
  getProducerOrders(page: number = 1, limit: number = 10): Observable<ProducerOrderResponse> {
    return this.api.execute(new GetProducerOrdersRequest(page, limit));
  }
}
