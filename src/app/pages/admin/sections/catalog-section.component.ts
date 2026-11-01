import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { AdminSpec } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import {
  errorMessage,
  formatDate,
  hueFor,
  initials,
  label,
  shortId,
  specStatus,
} from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminBadgeComponent } from '../ui/admin-badge.component';
import { AdminListFooterComponent } from '../ui/admin-list-footer.component';
import { AdminListStateComponent } from '../ui/admin-list-state.component';
import { AdminListToolbarComponent } from '../ui/admin-list-toolbar.component';

@Component({
  selector: 'app-admin-catalog',
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
      <app-admin-list-toolbar
        [list]="list"
        placeholder="Search by title or producer"
        noun="specs"
      />

      @if (list.items().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Spec</th>
                <th>Producer</th>
                <th>Category</th>
                <th class="end">Price</th>
                <th>Status</th>
                <th>Created</th>
                <th class="end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (spec of list.items(); track spec.id) {
                <tr>
                  <td>
                    <div class="cell-stack">
                      <strong>{{ spec.title }}</strong>
                      <span>#{{ shortId(spec.id) }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="identity">
                      <span
                        class="avatar"
                        aria-hidden="true"
                        [style.--hue]="hue(spec.producer_email)"
                        >{{ producerInitials(spec) }}</span
                      >
                      <div class="cell-stack">
                        <strong>{{ spec.producer_name }}</strong>
                        <span>{{ spec.producer_email }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ label(spec.category) }}</td>
                  <td class="end num">{{ spec.base_price }}</td>
                  <td><app-admin-badge [status]="status(spec)" /></td>
                  <td class="muted">{{ formatDate(spec.created_at) }}</td>
                  <td class="end">
                    <div class="actions">
                      <button
                        type="button"
                        class="row-btn"
                        [class.danger]="!spec.is_deleted"
                        [disabled]="isPending(spec.id)"
                        (click)="toggleDeleted(spec)"
                      >
                        <i
                          class="fa-solid"
                          [class.fa-eye-slash]="!spec.is_deleted"
                          [class.fa-eye]="spec.is_deleted"
                          aria-hidden="true"
                        ></i>
                        {{ spec.is_deleted ? 'Restore' : 'Hide' }}
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-admin-list-state [list]="list" noun="specs" />
      <app-admin-list-footer [list]="list" />
    </section>
  `,
})
export class AdminCatalogSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly list = new AdminList<AdminSpec>((query) => this.admin.getSpecs(query));
  readonly pending = signal<ReadonlySet<string>>(new Set());

  protected readonly formatDate = formatDate;
  protected readonly hue = hueFor;
  protected readonly label = label;
  protected readonly shortId = shortId;
  protected readonly status = specStatus;

  ngOnInit() {
    this.list.load();
  }

  ngOnDestroy() {
    this.list.destroy();
  }

  isPending(id: string): boolean {
    return this.pending().has(id);
  }

  protected producerInitials(spec: AdminSpec): string {
    return initials({
      display_name: spec.producer_name,
      name: spec.producer_name,
      email: spec.producer_email,
    });
  }

  toggleDeleted(spec: AdminSpec) {
    const previous = this.list.items();
    const isDeleted = !spec.is_deleted;
    this.begin(spec.id);
    this.list.patchItems((rows) =>
      rows.map((s) => (s.id === spec.id ? { ...s, is_deleted: isDeleted } : s)),
    );
    this.admin.setSpecDeleted(spec.id, isDeleted).subscribe({
      next: (updated) => {
        this.list.patchItems((rows) =>
          rows.map((s) => (s.id === spec.id ? { ...s, ...updated } : s)),
        );
        this.end(spec.id);
      },
      error: (err) => {
        this.list.items.set(previous);
        this.end(spec.id);
        this.toast.error(errorMessage(err, 'Could not update the spec.'));
      },
    });
  }

  private begin(id: string) {
    this.pending.update((ids) => new Set(ids).add(id));
  }

  private end(id: string) {
    this.pending.update((ids) => {
      const next = new Set(ids);
      next.delete(id);
      return next;
    });
  }
}
