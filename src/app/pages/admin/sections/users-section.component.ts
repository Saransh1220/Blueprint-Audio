import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { AdminUser, AdminUserStatus, SystemRole } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { errorMessage, hueFor, initials, label, userStatus } from '../admin-format';
import { AdminList } from '../admin-list';
import { AdminBadgeComponent } from '../ui/admin-badge.component';
import { AdminListFooterComponent } from '../ui/admin-list-footer.component';
import { AdminListStateComponent } from '../ui/admin-list-state.component';
import { AdminListToolbarComponent } from '../ui/admin-list-toolbar.component';

@Component({
  selector: 'app-admin-users',
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
      <app-admin-list-toolbar [list]="list" placeholder="Search by name or email" noun="users" />

      @if (list.items().length > 0) {
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Type</th>
                <th>Access</th>
                <th>Status</th>
                <th>Email</th>
                <th class="end">Actions</th>
              </tr>
            </thead>
            <tbody>
              @for (user of list.items(); track user.id) {
                <tr>
                  <td>
                    <div class="identity">
                      <span class="avatar" aria-hidden="true" [style.--hue]="hue(user.email)">{{
                        initials(user)
                      }}</span>
                      <div class="cell-stack">
                        <strong>{{ user.display_name || user.name }}</strong>
                        <span>{{ user.email }}</span>
                      </div>
                    </div>
                  </td>
                  <td>{{ label(user.role) }}</td>
                  <td>
                    @if (isSuperAdmin(user)) {
                      <span class="role-chip"
                        ><i class="fa-solid fa-shield-halved" aria-hidden="true"></i>Super
                        admin</span
                      >
                    } @else {
                      <span class="muted">User</span>
                    }
                  </td>
                  <td><app-admin-badge [status]="status(user)" /></td>
                  <td [class.muted]="!user.email_verified">
                    {{ user.email_verified ? 'Verified' : 'Unverified' }}
                  </td>
                  <td class="end">
                    <div class="actions">
                      <button
                        type="button"
                        class="row-btn"
                        [disabled]="isPending(user.id)"
                        (click)="setSuperAdmin(user, !isSuperAdmin(user))"
                      >
                        <i class="fa-solid fa-shield-halved" aria-hidden="true"></i>
                        {{ isSuperAdmin(user) ? 'Revoke super admin' : 'Make super admin' }}
                      </button>
                      <button
                        type="button"
                        class="row-btn"
                        [class.danger]="user.status === 'active'"
                        [disabled]="isPending(user.id)"
                        (click)="
                          setUserStatus(user, user.status === 'active' ? 'suspended' : 'active')
                        "
                      >
                        <i
                          class="fa-solid"
                          [class.fa-ban]="user.status === 'active'"
                          [class.fa-user-check]="user.status !== 'active'"
                          aria-hidden="true"
                        ></i>
                        {{ user.status === 'active' ? 'Suspend' : 'Reactivate' }}
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      <app-admin-list-state [list]="list" noun="users" />
      <app-admin-list-footer [list]="list" />
    </section>
  `,
})
export class AdminUsersSectionComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly toast = inject(ToastService);

  readonly list = new AdminList<AdminUser>((query) => this.admin.getUsers(query));

  /** Row ids with an update in flight, so a double click cannot send two. */
  readonly pending = signal<ReadonlySet<string>>(new Set());

  protected readonly initials = initials;
  protected readonly label = label;
  protected readonly hue = hueFor;
  protected readonly status = userStatus;

  ngOnInit() {
    this.list.load();
  }

  ngOnDestroy() {
    this.list.destroy();
  }

  protected isSuperAdmin(user: AdminUser): boolean {
    return user.system_role === SystemRole.SUPER_ADMIN;
  }

  isPending(id: string): boolean {
    return this.pending().has(id);
  }

  setSuperAdmin(user: AdminUser, makeSuper: boolean) {
    const systemRole = makeSuper ? SystemRole.SUPER_ADMIN : SystemRole.USER;
    this.begin(user.id);
    this.admin.setUserSystemRole(user.id, systemRole).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.end(user.id);
      },
      error: (err) => {
        this.end(user.id);
        this.toast.error(errorMessage(err, 'Could not change the role.'));
      },
    });
  }

  setUserStatus(user: AdminUser, status: AdminUserStatus) {
    const previous = this.list.items();
    this.begin(user.id);
    this.list.patchItems((rows) => rows.map((u) => (u.id === user.id ? { ...u, status } : u)));
    this.admin.setUserStatus(user.id, status).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.end(user.id);
      },
      error: (err) => {
        this.list.items.set(previous);
        this.end(user.id);
        this.toast.error(errorMessage(err, 'Could not change the account status.'));
      },
    });
  }

  private replace(updated: AdminUser) {
    this.list.patchItems((rows) => rows.map((u) => (u.id === updated.id ? updated : u)));
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
