import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderStatusDto } from '../../models/payment';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';

export type PaymentResultState =
  | 'loading'
  | 'confirming'
  | 'paid'
  | 'pending_timeout'
  | 'failed'
  | 'not_found';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

@Component({
  selector: 'app-payment-result',
  imports: [CommonModule, RouterLink],
  templateUrl: './payment-result.component.html',
  styleUrl: './payment-result.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PaymentResultComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);
  private destroyRef = inject(DestroyRef);

  state = signal<PaymentResultState>('loading');
  orderStatus = signal<OrderStatusDto | null>(null);
  orderId = signal<string | null>(null);
  copied = signal(false);

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
              this.toast.show('Payment confirmed successfully!', 'success');
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

  copyLicenseKey(key: string): void {
    if (!key) return;
    navigator.clipboard?.writeText(key).then(() => {
      this.copied.set(true);
      this.toast.show('License key copied to clipboard', 'info');
      setTimeout(() => this.copied.set(false), 3000);
    });
  }

  retryPolling(): void {
    const id = this.orderId();
    if (id) {
      this.startPolling(id);
    }
  }
}
