import { ChangeDetectionStrategy, Component, inject, OnDestroy, OnInit } from '@angular/core';
import { AdminAuditEntry } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { actionIcon, actionLabel, formatDate, formatIp, label, shortId } from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminListFooterComponent } from '../ui/admin-list-footer.component';
import { AdminListStateComponent } from '../ui/admin-list-state.component';
import { AdminListToolbarComponent } from '../ui/admin-list-toolbar.component';

@Component({
  selector: 'app-admin-audit',
  standalone: true,
  imports: [AdminListFooterComponent, AdminListStateComponent, AdminListToolbarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: '../admin-section.scss',
  template: `
    <section class="panel" [class.busy]="list.loading() && list.loaded()">
      <app-admin-list-toolbar
        [list]="list"
        placeholder="Search by action or administrator"
        noun="entries"
      />

      @if (list.items().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>Administrator</th>
                <th>Resource</th>
                <th>IP address</th>
                <th>When</th>
              </tr>
            </thead>
            <tbody>
              @for (entry of list.items(); track entry.id) {
                <tr>
                  <td>
                    <div class="identity">
                      <span class="feed-icon" aria-hidden="true"
                        ><i class="fa-solid" [class]="'fa-solid ' + icon(entry.action)"></i
                      ></span>
                      <div class="cell-stack">
                        <strong>{{ actionLabel(entry.action) }}</strong>
                        <span>{{ entry.action }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ entry.actor_email || 'System' }}</td>
                  <td>
                    {{ label(entry.resource_type) }}
                    @if (entry.resource_id) {
                      <span class="muted"> #{{ shortId(entry.resource_id) }}</span>
                    }
                  </td>
                  <td class="muted">{{ formatIp(entry.ip_address) }}</td>
                  <td class="muted">{{ formatDate(entry.created_at) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-admin-list-state [list]="list" noun="entries" />
      <app-admin-list-footer [list]="list" />
    </section>
  `,
})
export class AdminAuditSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);

  readonly list = new AdminList<AdminAuditEntry>((query) => this.admin.getAuditLog(query));

  protected readonly actionLabel = actionLabel;
  protected readonly formatDate = formatDate;
  protected readonly formatIp = formatIp;
  protected readonly icon = actionIcon;
  protected readonly label = label;
  protected readonly shortId = shortId;

  ngOnInit() {
    this.list.load();
  }

  ngOnDestroy() {
    this.list.destroy();
  }
}
