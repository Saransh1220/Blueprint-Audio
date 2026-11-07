import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AdminOrder } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { formatDate, formatMoney, label, orderStatus, shortId } from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminBadgeComponent } from '../ui/admin-badge.component';
import { AdminListFooterComponent } from '../ui/admin-list-footer.component';
import { AdminListStateComponent } from '../ui/admin-list-state.component';
import { AdminListToolbarComponent } from '../ui/admin-list-toolbar.component';

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [
    AdminBadgeComponent,
    AdminListFooterComponent,
    AdminListStateComponent,
    AdminListToolbarComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../admin-section.scss',
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
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-admin-list-state [list]="list" noun="orders" />
      <app-admin-list-footer [list]="list" />
    </section>
  `,
})
export class AdminOrdersSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);

  readonly list = new AdminList<AdminOrder>((query) => this.admin.getOrders(query));

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
}
