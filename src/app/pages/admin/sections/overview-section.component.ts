import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnDestroy,
  OnInit,
  output,
} from '@angular/core';
import { AdminAuditEntry, AdminOrder, AdminOverview } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import {
  actionIcon,
  actionLabel,
  formatDate,
  formatMoney,
  formatNumber,
  orderStatus,
  toneIcon,
} from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminTab } from '../admin-sections';
import { AdminBadgeComponent } from '../ui/admin-badge.component';
import { AdminStatCardComponent } from '../ui/admin-stat-card.component';

const RECENT_ITEMS = 5;

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [AdminBadgeComponent, AdminStatCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../admin-section.scss',
  styles: `
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .notice {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      font-size: 13px;
      color: var(--warn);
    }

    .recent {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }

    @media (max-width: 1000px) {
      .recent {
        grid-template-columns: minmax(0, 1fr);
      }
    }

    @media (max-width: 600px) {
      .stats {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }

      .stats app-admin-stat-card:last-child:nth-child(odd) {
        grid-column: 1 / -1;
      }
    }
  `,
  template: `
    <section class="stats" aria-label="Platform totals">
      <app-admin-stat-card
        label="Users"
        icon="fa-users"
        tint="indigo"
        [value]="formatNumber(overview().users)"
      />
      <app-admin-stat-card
        label="Producers"
        icon="fa-microphone-lines"
        tint="violet"
        [value]="formatNumber(overview().producers)"
      />
      <app-admin-stat-card
        label="Specs"
        icon="fa-compact-disc"
        tint="teal"
        [value]="formatNumber(overview().specs)"
      />
      <app-admin-stat-card
        label="Paid orders"
        icon="fa-receipt"
        tint="green"
        [value]="formatNumber(overview().paid_orders)"
      />
      <app-admin-stat-card
        label="Paid revenue"
        icon="fa-wallet"
        tint="amber"
        note="Summed across all currencies"
        [value]="formatMoney(overview().revenue)"
      />
    </section>

    @if (failed()) {
      <p class="notice" role="alert">
        <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
        Could not load the platform totals.
        <button type="button" class="link" (click)="retry.emit()">Try again</button>
      </p>
    }

    <div class="recent">
      <section class="panel">
        <div class="panel-head">
          <h2>Recent orders</h2>
          <button type="button" class="link" (click)="open.emit('orders')">
            View all <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
        @if (orders.failed()) {
          <p class="feed-empty">Could not load orders.</p>
        } @else if (orders.isEmpty()) {
          <p class="feed-empty">No orders yet.</p>
        } @else {
          <ul class="feed">
            @for (order of orders.items(); track order.id) {
              <li>
                <span class="feed-icon" aria-hidden="true" [attr.data-tone]="status(order).tone"
                  ><i [class]="'fa-solid ' + toneIcon(status(order).tone)"></i
                ></span>
                <div class="feed-main">
                  <strong>{{ order.spec_title }}</strong>
                  <span>{{ order.buyer_email }}</span>
                </div>
                <div class="feed-side">
                  <strong class="num">{{ formatMoney(order.amount, order.currency) }}</strong>
                  <app-admin-badge [status]="status(order)" />
                </div>
              </li>
            }
          </ul>
        }
      </section>

      <section class="panel">
        <div class="panel-head">
          <h2>Recent activity</h2>
          <button type="button" class="link" (click)="open.emit('audit')">
            View all <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
          </button>
        </div>
        @if (activity.failed()) {
          <p class="feed-empty">Could not load activity.</p>
        } @else if (activity.isEmpty()) {
          <p class="feed-empty">No administrator activity yet.</p>
        } @else {
          <ul class="feed">
            @for (entry of activity.items(); track entry.id) {
              <li>
                <span class="feed-icon" aria-hidden="true"
                  ><i [class]="'fa-solid ' + actionIcon(entry.action)"></i
                ></span>
                <div class="feed-main">
                  <strong>{{ actionLabel(entry.action) }}</strong>
                  <span>{{ entry.actor_email || 'System' }}</span>
                </div>
                <div class="feed-side">
                  <span>{{ formatDate(entry.created_at) }}</span>
                </div>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
})
export class AdminOverviewSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);

  readonly overview = input<AdminOverview>({});
  readonly failed = input(false);
  readonly retry = output<void>();
  readonly open = output<AdminTab>();

  // The overview shows a short slice of two lists: the UI asks for 5 rows.
  readonly orders = new AdminList<AdminOrder>((query) => this.admin.getOrders(query), RECENT_ITEMS);
  readonly activity = new AdminList<AdminAuditEntry>(
    (query) => this.admin.getAuditLog(query),
    RECENT_ITEMS,
  );

  protected readonly actionIcon = actionIcon;
  protected readonly actionLabel = actionLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly formatNumber = formatNumber;
  protected readonly status = (order: AdminOrder) => orderStatus(order.status);
  protected readonly toneIcon = toneIcon;

  ngOnInit() {
    this.orders.load();
    this.activity.load();
  }

  ngOnDestroy() {
    this.orders.destroy();
    this.activity.destroy();
  }
}
