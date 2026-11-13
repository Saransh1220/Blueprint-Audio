import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { OrderStatusDto } from '../../models/payment';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { PurchasedFilesComponent } from './purchased-files.component';
import { CheckoutTillComponent } from './checkout-till.component';
import { CurrencyService } from '../../services/currency.service';

export type PaymentResultState =
  'loading' | 'confirming' | 'paid' | 'pending_timeout' | 'failed' | 'not_found';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-payment-result',
  imports: [RouterLink, PurchasedFilesComponent, CheckoutTillComponent],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private paymentService = inject(PaymentService);
  private currency = inject(CurrencyService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  state = signal<PaymentResultState>('loading');
  orderStatus = signal<OrderStatusDto | null>(null);
  orderId = signal<string | null>(null);
  copied = signal(false);
  readonly paidTotal = signal<string | null>(null);

  ngOnInit(): void {
    const rawOrderId = this.route.snapshot.queryParamMap.get('order_id');
    if (!rawOrderId || !UUID_REGEX.test(rawOrderId.trim())) {
      this.state.set('not_found');
      return;
    }

    const validOrderId = rawOrderId.trim();
    this.orderId.set(validOrderId);
    this.startPolling(validOrderId);
  }

  private startPolling(orderId: string): void {
    this.state.set('confirming');

    this.paymentService
      .pollOrderStatus(orderId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (status) => {
          this.orderStatus.set(status);
          switch (status.status) {
            case 'paid':
              this.state.set('paid');
              this.paymentService
                .getOrder(orderId)
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe({
                  next: (order) => {
                    if (order.status === 'paid') {
                      this.paidTotal.set(
                        this.currency.formatMinorMoney(order.amount, order.currency),
                      );
                    }
                  },
                  error: () => this.paidTotal.set(null),
                });
              // Refresh user licenses in background
              this.paymentService.fetchUserLicenses().subscribe();
              break;
            case 'failed':
            case 'cancelled':
            case 'refunded':
              this.state.set('failed');
              break;
            case 'pending':
            case 'processing':
            default:
              this.state.set('confirming');
              break;
          }
        },
        error: (err) => {
          if (err?.status === 404) {
            this.state.set('not_found');
          } else {
            this.state.set('pending_timeout');
          }
        },
        complete: () => {
          if (this.state() === 'confirming') {
            this.state.set('pending_timeout');
          }
        },
      });
  }

  async copyLicenseKey(key: string): Promise<void> {
    if (!key) return;
    try {
      await navigator.clipboard.writeText(key);
      this.copied.set(true);
    } catch {
      this.toast.show(
        'Could not copy the license key. You can select and copy it manually.',
        'info',
      );
    }
  }

  retryPolling(): void {
    const id = this.orderId();
    if (id) {
      this.startPolling(id);
    }
  }
}
