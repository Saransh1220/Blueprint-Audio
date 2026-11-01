import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AdminLicense } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import {
  formatDate,
  formatMoney,
  formatNumber,
  label,
  licenseStatus,
  shortId,
} from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminBadgeComponent } from '../ui/admin-badge.component';
import { AdminListFooterComponent } from '../ui/admin-list-footer.component';
import { AdminListStateComponent } from '../ui/admin-list-state.component';
import { AdminListToolbarComponent } from '../ui/admin-list-toolbar.component';

@Component({
  selector: 'app-admin-licenses',
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
      <app-admin-list-toolbar [list]="list" placeholder="Search by owner or spec" noun="licenses" />

      @if (list.items().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Spec</th>
                <th>Owner</th>
                <th>License</th>
                <th class="end">Price</th>
                <th class="end">Downloads</th>
                <th>Status</th>
                <th>Issued</th>
              </tr>
            </thead>
            <tbody>
              @for (license of list.items(); track license.id) {
                <tr>
                  <td>
                    <div class="cell-stack">
                      <strong>{{ license.spec_title }}</strong>
                      <span>#{{ shortId(license.id) }}</span>
                    </div>
                  </td>
                  <td>{{ license.user_email }}</td>
                  <td>{{ label(license.license_type) }}</td>
                  <td class="end num">{{ formatMoney(license.purchase_price) }}</td>
                  <td class="end num">{{ formatNumber(license.downloads_count) }}</td>
                  <td><app-admin-badge [status]="status(license)" /></td>
                  <td class="muted">{{ formatDate(license.issued_at) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-admin-list-state [list]="list" noun="licenses" />
      <app-admin-list-footer [list]="list" />
    </section>
  `,
})
export class AdminLicensesSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);

  readonly list = new AdminList<AdminLicense>((query) => this.admin.getLicenses(query));

  protected readonly formatDate = formatDate;
  protected readonly formatMoney = formatMoney;
  protected readonly formatNumber = formatNumber;
  protected readonly label = label;
  protected readonly shortId = shortId;
  protected readonly status = licenseStatus;

  ngOnInit() {
    this.list.load();
  }

  ngOnDestroy() {
    this.list.destroy();
  }
}
