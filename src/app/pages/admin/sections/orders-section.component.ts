import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { AdminOrder } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { AuthzService } from '../../../services/authz.service';
import { PaymentService } from '../../../services/payment.service';
import { ToastService } from '../../../services/toast.service';
import { formatDate, formatMoney, label, orderStatus, shortId } from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminBadgeComponent } from '../ui/admin-badge.component';
import { AdminListFooterComponent } from '../ui/admin-list-footer.component';
import { AdminListStateComponent } from '../ui/admin-list-state.component';
import { AdminListToolbarComponent } from '../ui/admin-list-toolbar.component';

@Component({
  selector: 'app-admin-orders',
  imports: [
    AdminBadgeComponent,
    AdminListFooterComponent,
    AdminListStateComponent,
    AdminListToolbarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../admin-section.scss',
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 1000;
        display: grid;
        place-items: center;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(4px);
        padding: 16px;
      }

      .modal-dialog {
        width: 100%;
        max-width: 480px;
        background: var(--surface);
        border: 1px solid var(--line-strong);
        border-radius: 12px;
        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
        overflow: hidden;
        animation: modalIn 0.15s ease-out;
      }

      @keyframes modalIn {
        from {
          opacity: 0;
          transform: translateY(8px) scale(0.98);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      .modal-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid var(--line);
        background: var(--surface-2);
      }

      .modal-head h3 {
        margin: 0;
        font-size: 15px;
        font-weight: 600;
        color: var(--text);
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .modal-head h3 i {
        color: var(--bad);
        font-size: 14px;
      }

      .btn-icon {
        border: 0;
        background: none;
        color: var(--text-muted);
        cursor: pointer;
        padding: 4px 6px;
        font-size: 14px;
        border-radius: 6px;
      }

      .btn-icon:hover {
        color: var(--text);
        background: var(--surface-3);
      }

      .modal-body {
        padding: 18px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--line);
      }

      .detail-label {
        color: var(--text-muted);
        font-weight: 500;
      }

      .detail-value {
        color: var(--text);
        font-weight: 500;
      }

      .detail-value.highlight {
        font-weight: 600;
        color: var(--accent);
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .form-group label {
        font-size: 12.5px;
        font-weight: 500;
        color: var(--text-2);
      }

      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        background: var(--surface-2);
        color: var(--text);
        font: inherit;
        font-size: 13px;
        box-sizing: border-box;
      }

      .form-group select:focus,
      .form-group textarea:focus {
        outline: none;
        border-color: var(--accent);
      }

      .modal-notice {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 8px;
        background: color-mix(in srgb, var(--bad) 10%, transparent);
        border: 1px solid color-mix(in srgb, var(--bad) 25%, transparent);
        font-size: 12px;
        line-height: 1.4;
        color: var(--bad);
      }

      .modal-notice i {
        margin-top: 2px;
        flex-shrink: 0;
      }

      .modal-foot {
        display: flex;
        justify-content: flex-end;
        align-items: center;
        gap: 10px;
        padding: 14px 18px;
        border-top: 1px solid var(--line);
        background: var(--surface-2);
      }

      .btn-cancel {
        height: 34px;
        padding: 0 14px;
        border: 1px solid var(--line-strong);
        border-radius: 8px;
        background: transparent;
        color: var(--text-2);
        font: inherit;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
      }

      .btn-cancel:hover:not(:disabled) {
        background: var(--surface-3);
        color: var(--text);
      }

      .btn-confirm-danger {
        height: 34px;
        padding: 0 16px;
        border: 1px solid var(--bad);
        border-radius: 8px;
        background: var(--bad);
        color: #fff;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-confirm-danger:hover:not(:disabled) {
        opacity: 0.9;
      }

      .btn-confirm-danger:disabled,
      .btn-cancel:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    `,
  ],
  template: `
    <section class="panel" [class.busy]="list.loading() && list.loaded()">
      <app-admin-list-toolbar [list]="list" placeholder="Search by buyer or spec" noun="orders" />

      @if (list.items().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Spec</th>
                <th>Buyer</th>
                <th>License</th>
                <th class="end">Amount</th>
                <th>Status</th>
                <th>Placed</th>
                <th class="end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (order of list.items(); track order.id) {
                <tr>
                  <td>
                    <div class="cell-stack">
                      <strong>{{ order.spec_title }}</strong>
                      <span>#{{ shortId(order.id) }}</span>
                    </div>
                  </td>
                  <td>{{ order.buyer_email }}</td>
                  <td>{{ label(order.license_type) }}</td>
                  <td class="end num">{{ formatMoney(order.amount, order.currency) }}</td>
                  <td><app-admin-badge [status]="status(order.status)" /></td>
                  <td class="muted">{{ formatDate(order.created_at) }}</td>
                  <td class="end">
                    <div class="actions">
                      @if (canRefund() && order.status === 'paid') {
                        <button
                          type="button"
                          class="row-btn danger"
                          [disabled]="isPending(order.id)"
                          (click)="openRefundDialog(order)"
                          title="Issue full refund"
                        >
                          <i class="fa-solid fa-rotate-left" aria-hidden="true"></i>
                          Refund
                        </button>
                      }
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-admin-list-state [list]="list" noun="orders" />
      <app-admin-list-footer [list]="list" />

      @if (activeRefundOrder(); as targetOrder) {
        <div class="modal-backdrop" (click)="closeRefundDialog()">
          <div
            class="modal-dialog"
            (click)="$event.stopPropagation()"
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-modal-title"
          >
            <div class="modal-head">
              <h3 id="refund-modal-title">
                <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Refund Order
              </h3>
              <button
                type="button"
                class="btn-icon"
                (click)="closeRefundDialog()"
                aria-label="Close dialog"
                [disabled]="isRefunding()"
              >
                <i class="fa-solid fa-xmark" aria-hidden="true"></i>
              </button>
            </div>

            <div class="modal-body">
              <div class="detail-row">
                <span class="detail-label">Order</span>
                <span class="detail-value"
                  >#{{ shortId(targetOrder.id) }} ({{ targetOrder.spec_title }})</span
                >
              </div>
              <div class="detail-row">
                <span class="detail-label">Buyer</span>
                <span class="detail-value">{{ targetOrder.buyer_email }}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Captured Amount</span>
                <span class="detail-value highlight">{{
                  formatMoney(targetOrder.amount, targetOrder.currency)
                }}</span>
              </div>

              <div class="form-group">
                <label for="refund-reason">Refund Reason *</label>
                <select
                  id="refund-reason"
                  [value]="refundReason()"
                  (change)="onReasonChange($event)"
                >
                  <option value="customer_request">Customer Request</option>
                  <option value="duplicate">Duplicate Purchase</option>
                  <option value="fraudulent">Fraudulent / Unauthorized</option>
                  <option value="accidental_purchase">Accidental Purchase</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div class="form-group">
                <label for="refund-notes">Notes (optional)</label>
                <textarea
                  id="refund-notes"
                  rows="3"
                  placeholder="Reason details or support ticket reference"
                  [value]="refundNotes()"
                  (input)="onNotesChange($event)"
                ></textarea>
              </div>

              <div class="modal-notice">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                <span
                  >A full refund will be requested from
                  {{ targetOrder.provider || 'payment provider' }}. Associated licenses and download
                  access will be revoked immediately upon confirmation.</span
                >
              </div>
            </div>

            <div class="modal-foot">
              <button
                type="button"
                class="btn-cancel"
                (click)="closeRefundDialog()"
                [disabled]="isRefunding()"
              >
                Cancel
              </button>
              <button
                type="button"
                class="btn-confirm-danger"
                (click)="submitRefund(targetOrder)"
                [disabled]="isRefunding()"
              >
                @if (isRefunding()) {
                  <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> Processing...
                } @else {
                  <i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Confirm Full Refund
                }
              </button>
            </div>
          </div>
        </div>
      }
    </section>
  `,
})
export class AdminOrdersSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly authz = inject(AuthzService);
  private readonly payment = inject(PaymentService);
  private readonly toast = inject(ToastService);

  readonly list = new AdminList<AdminOrder>((query) => this.admin.getOrders(query));

  readonly canRefund = computed(() => this.authz.isSuperAdmin());
  readonly activeRefundOrder = signal<AdminOrder | null>(null);
  readonly refundReason = signal<string>('customer_request');
  readonly refundNotes = signal<string>('');
  readonly isRefunding = signal<boolean>(false);

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly label = label;
  protected readonly shortId = shortId;
  protected readonly status = orderStatus;

  ngOnInit() {
    this.list.load();
  }

  ngOnDestroy() {
    this.list.destroy();
  }

  isPending(orderId: string): boolean {
    return this.isRefunding() && this.activeRefundOrder()?.id === orderId;
  }

  openRefundDialog(order: AdminOrder): void {
    this.activeRefundOrder.set(order);
    this.refundReason.set('customer_request');
    this.refundNotes.set('');
  }

  closeRefundDialog(): void {
    if (this.isRefunding()) return;
    this.activeRefundOrder.set(null);
  }

  onReasonChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.refundReason.set(target.value);
  }

  onNotesChange(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.refundNotes.set(target.value);
  }

  submitRefund(order: AdminOrder): void {
    if (this.isRefunding()) return;
    this.isRefunding.set(true);

    this.payment.refundOrder(order.id, this.refundReason(), this.refundNotes()).subscribe({
      next: (res) => {
        this.isRefunding.set(false);
        this.activeRefundOrder.set(null);
        const statusMsg = res.status === 'succeeded' ? 'completed successfully' : res.status;
        this.toast.show(`Refund ${statusMsg}`, 'success');
        this.list.load();
      },
      error: (err) => {
        this.isRefunding.set(false);
        const msg = err?.error?.message || 'Failed to issue refund';
        this.toast.show(msg, 'error');
      },
    });
  }
}
