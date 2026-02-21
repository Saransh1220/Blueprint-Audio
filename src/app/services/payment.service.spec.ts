import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import {
  CreateOrderRequest,
  GetLicenseDownloadsRequest,
  GetProducerOrdersRequest,
  GetUserLicensesRequest,
  VerifyPaymentRequest,
} from '../core/api/payment.requests';
import { ApiService } from '../core/services/api.service';
import { AuthService } from './auth.service';
import { PaymentService } from './payment.service';
import { ToastService } from './toast.service';

describe('PaymentService', () => {
  function setup(execute: ReturnType<typeof vi.fn>) {
    const show = vi.fn();
    const navigate = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        { provide: ApiService, useValue: { execute } },
        { provide: ToastService, useValue: { show } },
        { provide: AuthService, useValue: { currentUser: () => null } },
        { provide: Router, useValue: { navigate } },
      ],
    });

    return { service: TestBed.inject(PaymentService), show, navigate };
  }

  it('fetchUserLicenses stores data and metadata and returns list', () => {
    const execute = vi.fn().mockReturnValue(
      of({
        data: [{ id: 'l1', spec_id: 's1', is_active: true, is_revoked: false }],
        metadata: { page: 1, limit: 10, total: 1, total_pages: 1 },
      }),
    );
    const { service } = setup(execute);

    service.fetchUserLicenses(1, 'trap', 'Basic').subscribe((licenses) => {
      expect(licenses).toHaveLength(1);
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetUserLicensesRequest);
    expect(service.userLicenses()).toHaveLength(1);
    expect(service.licensePagination()).not.toBeNull();
  });

  it('hasLicenseForSpec checks active non-revoked license', () => {
    const execute = vi.fn().mockReturnValue(of([]));
    const { service } = setup(execute);

    service.userLicenses.set([
      { spec_id: 's1', is_active: true, is_revoked: false },
      { spec_id: 's2', is_active: true, is_revoked: true },
    ] as never);

    expect(service.hasLicenseForSpec('s1')).toBe(true);
    expect(service.hasLicenseForSpec('s2')).toBe(false);
  });

  it('getLicenseDownloads delegates to ApiService', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const { service } = setup(execute);

    service.getLicenseDownloads('lic-1').subscribe();
    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetLicenseDownloadsRequest);
  });

  it('getProducerOrders delegates to ApiService', () => {
    const execute = vi.fn().mockReturnValue(of({ orders: [], total: 0, limit: 20, offset: 0 }));
    const { service } = setup(execute);

    service.getProducerOrders(3).subscribe();
    expect(execute.mock.calls[0][0]).toBeInstanceOf(GetProducerOrdersRequest);
    expect((execute.mock.calls[0][0] as GetProducerOrdersRequest).params?.get('page')).toBe('3');
  });

  it('initiatePayment surfaces create-order errors with toast', () => {
    const execute = vi.fn().mockReturnValue(throwError(() => new Error('create failed')));
    const { service, show } = setup(execute);

    service.initiatePayment('s1', 'lic1', 'Spec').subscribe({
      error: () => undefined,
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(CreateOrderRequest);
    expect(show).toHaveBeenCalledWith('Failed to create order. Please try again.', 'error');
  });

  it('handlePaymentSuccess verifies payment and navigates on success', () => {
    const execute = vi.fn().mockReturnValue(of({ message: 'Payment verified' }));
    const { service, show, navigate } = setup(execute);
    const fetchSpy = vi.spyOn(service, 'fetchUserLicenses').mockReturnValue(of([]));

    (service as any).handlePaymentSuccess('order-1', {
      razorpay_payment_id: 'pay-1',
      razorpay_signature: 'sig-1',
      razorpay_order_id: 'rzp-order-1',
    });

    expect(execute.mock.calls[0][0]).toBeInstanceOf(VerifyPaymentRequest);
    expect(fetchSpy).toHaveBeenCalled();
    expect(show).toHaveBeenCalledWith('Payment verified', 'success');
    expect(navigate).toHaveBeenCalledWith(['/purchases']);
  });

  it('openRazorpayCheckout wires handler and dismiss callbacks', () => {
    const execute = vi.fn().mockReturnValue(of({}));
    const show = vi.fn();
    const navigate = vi.fn();
    const handleSpy = vi.fn();

    const RazorpayMock = vi.fn(function (this: any, options: any) {
      this.options = options;
      this.open = vi.fn(() => {
        options.modal.ondismiss();
        options.handler({
          razorpay_payment_id: 'pay-1',
          razorpay_signature: 'sig-1',
          razorpay_order_id: 'rzp-order-1',
        });
      });
    });
    (window as any).Razorpay = RazorpayMock;

    TestBed.configureTestingModule({
      providers: [
        PaymentService,
        { provide: ApiService, useValue: { execute } },
        { provide: ToastService, useValue: { show } },
        {
          provide: AuthService,
          useValue: { currentUser: () => ({ name: 'Sam', email: 'sam@test.com' }) },
        },
        { provide: Router, useValue: { navigate } },
      ],
    });
    const service = TestBed.inject(PaymentService);
    vi.spyOn(service as any, 'handlePaymentSuccess').mockImplementation(handleSpy);

    (service as any).openRazorpayCheckout(
      { id: 'o1', amount: 1000, currency: 'INR', razorpay_order_id: 'rzp-1' },
      'Spec',
    );

    expect(RazorpayMock).toHaveBeenCalledTimes(1);
    expect(show).toHaveBeenCalledWith('Payment cancelled', 'info');
    expect(handleSpy).toHaveBeenCalledWith('o1', {
      razorpay_payment_id: 'pay-1',
      razorpay_signature: 'sig-1',
      razorpay_order_id: 'rzp-order-1',
    });
  });
});
