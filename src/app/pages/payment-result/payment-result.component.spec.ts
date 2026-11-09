import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OrderStatusDto } from '../../models/payment';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { PaymentResultComponent } from './payment-result.component';

describe('PaymentResultComponent', () => {
  let fixture: ComponentFixture<PaymentResultComponent>;
  let component: PaymentResultComponent;
  let mockPaymentService: {
    pollOrderStatus: ReturnType<typeof vi.fn>;
    fetchUserLicenses: ReturnType<typeof vi.fn>;
  };
  let mockToast: {
    show: ReturnType<typeof vi.fn>;
  };

  const validOrderId = '12345678-1234-4234-8234-123456789abc';

  const setupComponent = (queryParams: Record<string, string>) => {
    mockPaymentService = {
      pollOrderStatus: vi.fn(),
      fetchUserLicenses: vi.fn().mockReturnValue(of([])),
    };
    mockToast = {
      show: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [PaymentResultComponent],
      providers: [
        provideRouter([]),
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: ToastService, useValue: mockToast },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: {
                get: (key: string) => queryParams[key] || null,
              },
            },
          },
        },
      ],
    });

    fixture = TestBed.createComponent(PaymentResultComponent);
    component = fixture.componentInstance;
  };

  it('sets not_found state when order_id query param is missing', () => {
    setupComponent({});
    fixture.detectChanges();

    expect(component.state()).toBe('not_found');
    expect(mockPaymentService.pollOrderStatus).not.toHaveBeenCalled();
  });

  it('sets not_found state when order_id query param is not a valid UUID', () => {
    setupComponent({ order_id: 'invalid-order-id-123' });
    fixture.detectChanges();

    expect(component.state()).toBe('not_found');
    expect(mockPaymentService.pollOrderStatus).not.toHaveBeenCalled();
  });

  it('starts polling and transitions to confirming when valid order_id is present', () => {
    setupComponent({ order_id: validOrderId });
    const statusSubject = new BehaviorSubject<OrderStatusDto>({
      order_id: validOrderId,
      status: 'pending',
      provider: 'razorpay',
      expires_at: '2026-11-07T20:00:00Z',
      retry_after_seconds: 2,
    });
    mockPaymentService.pollOrderStatus.mockReturnValue(statusSubject.asObservable());

    fixture.detectChanges();

    expect(component.state()).toBe('confirming');
    expect(component.orderId()).toBe(validOrderId);
    expect(mockPaymentService.pollOrderStatus).toHaveBeenCalledWith(validOrderId);
  });

  it('transitions to paid state when order becomes paid', () => {
    setupComponent({ order_id: validOrderId });
    const statusSubject = new BehaviorSubject<OrderStatusDto>({
      order_id: validOrderId,
      status: 'pending',
      provider: 'razorpay',
      expires_at: '2026-11-07T20:00:00Z',
      retry_after_seconds: 2,
    });
    mockPaymentService.pollOrderStatus.mockReturnValue(statusSubject.asObservable());

    fixture.detectChanges();
    expect(component.state()).toBe('confirming');

    // Simulate poll emission for paid status
    statusSubject.next({
      order_id: validOrderId,
      status: 'paid',
      provider: 'razorpay',
      expires_at: '2026-11-07T20:00:00Z',
      retry_after_seconds: 0,
      license: {
        id: 'lic-123',
        license_key: 'LIC-RW-999',
      },
    });

    expect(component.state()).toBe('paid');
    expect(mockToast.show).toHaveBeenCalledWith('Payment confirmed successfully!', 'success');
    expect(mockPaymentService.fetchUserLicenses).toHaveBeenCalled();
  });

  it('transitions to failed state when status is failed or cancelled or refunded', () => {
    setupComponent({ order_id: validOrderId });
    mockPaymentService.pollOrderStatus.mockReturnValue(
      of({
        order_id: validOrderId,
        status: 'failed',
        provider: 'dodo',
        expires_at: '2026-11-07T20:00:00Z',
        retry_after_seconds: 0,
      } as OrderStatusDto),
    );

    fixture.detectChanges();
    expect(component.state()).toBe('failed');
  });

  it('transitions to not_found on 404 error from service', () => {
    setupComponent({ order_id: validOrderId });
    mockPaymentService.pollOrderStatus.mockReturnValue(
      throwError(() => ({ status: 404, message: 'Order not found' })),
    );

    fixture.detectChanges();
    expect(component.state()).toBe('not_found');
  });

  it('transitions to pending_timeout on non-404 error or timeout', () => {
    setupComponent({ order_id: validOrderId });
    mockPaymentService.pollOrderStatus.mockReturnValue(
      throwError(() => ({ status: 500, message: 'Server error' })),
    );

    fixture.detectChanges();
    expect(component.state()).toBe('pending_timeout');
  });
});
