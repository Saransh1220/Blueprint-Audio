import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpParams } from '@angular/common/http';
import { ApiService } from '../../core/services/api.service';
import { SystemRole } from '../../models';

type AdminTab = 'overview' | 'users' | 'specs' | 'orders' | 'licenses' | 'audit';

interface PageResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    per_page: number;
  };
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  display_name?: string | null;
  role: string;
  system_role: SystemRole;
  status: 'active' | 'suspended';
  email_verified: boolean;
  created_at: string;
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);

  readonly SystemRole = SystemRole;
  readonly activeTab = signal<AdminTab>('overview');
  readonly loading = signal(false);
  readonly search = signal('');
  readonly overview = signal<Record<string, number>>({});
  readonly users = signal<AdminUser[]>([]);
  readonly specs = signal<Record<string, any>[]>([]);
  readonly orders = signal<Record<string, any>[]>([]);
  readonly licenses = signal<Record<string, any>[]>([]);
  readonly auditLogs = signal<Record<string, any>[]>([]);

  readonly paidRevenue = computed(() => ((this.overview()['revenue'] || 0) / 100).toFixed(2));

  ngOnInit() {
    this.loadOverview();
    this.loadUsers();
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'overview') this.loadOverview();
    if (tab === 'users') this.loadUsers();
    if (tab === 'specs') this.loadSpecs();
    if (tab === 'orders') this.loadOrders();
    if (tab === 'licenses') this.loadLicenses();
    if (tab === 'audit') this.loadAudit();
  }

  loadOverview() {
    this.loading.set(true);
    this.api.get<Record<string, number>>('/admin/analytics/overview').subscribe({
      next: (data) => this.overview.set(data),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  loadUsers() {
    this.loading.set(true);
    const params = this.search().trim()
      ? new HttpParams().set('q', this.search().trim())
      : new HttpParams();
    this.api.get<PageResponse<AdminUser>>('/admin/users', params).subscribe({
      next: (res) => this.users.set(res.data || []),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  loadSpecs() {
    this.loading.set(true);
    this.api.get<PageResponse<Record<string, any>>>('/admin/specs').subscribe({
      next: (res) => this.specs.set(res.data || []),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  loadOrders() {
    this.loading.set(true);
    this.api.get<PageResponse<Record<string, any>>>('/admin/orders').subscribe({
      next: (res) => this.orders.set(res.data || []),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  loadLicenses() {
    this.loading.set(true);
    this.api.get<PageResponse<Record<string, any>>>('/admin/licenses').subscribe({
      next: (res) => this.licenses.set(res.data || []),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  loadAudit() {
    this.loading.set(true);
    this.api.get<PageResponse<Record<string, any>>>('/admin/audit-log').subscribe({
      next: (res) => this.auditLogs.set(res.data || []),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  setSuperAdmin(user: AdminUser, makeSuper: boolean) {
    this.api
      .patch<AdminUser>(`/admin/users/${user.id}/system-role`, {
        system_role: makeSuper ? SystemRole.SUPER_ADMIN : SystemRole.USER,
      })
      .subscribe({
        next: (updated) => {
          this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u)));
        },
        error: (err) => {
          console.error('Failed to update system role', err);
        },
      });
  }

  setUserStatus(user: AdminUser, status: 'active' | 'suspended') {
    const previousUsers = [...this.users()];
    this.users.update((users) => users.map((u) => (u.id === user.id ? { ...u, status } : u)));
    this.api.patch<AdminUser>(`/admin/users/${user.id}/status`, { status }).subscribe({
      next: (updated) => {
        this.users.update((users) => users.map((u) => (u.id === updated.id ? updated : u)));
      },
      error: (err) => {
        console.error('Failed to update user status', err);
        this.users.set(previousUsers);
      },
    });
  }

  toggleSpecDeleted(spec: Record<string, any>) {
    const id = spec['id'];
    const previousSpecs = this.specs().map((item) => ({ ...item }));
    const nextDeleted = !spec['is_deleted'];
    this.specs.update((specs) =>
      specs.map((item) => (item['id'] === id ? { ...item, is_deleted: nextDeleted } : item)),
    );
    this.api
      .patch<Record<string, any>>(`/admin/specs/${id}`, { is_deleted: nextDeleted })
      .subscribe({
        next: (updated) => {
          this.specs.update((specs) =>
            specs.map((item) => (item['id'] === id ? { ...item, ...updated } : item)),
          );
        },
        error: (err) => {
          console.error('Failed to update spec visibility', err);
          this.specs.set(previousSpecs);
        },
      });
  }

  formatMoney(value: any) {
    const amount = Number(value || 0) / 100;
    return `Rs ${amount.toFixed(2)}`;
  }

  shortId(value: any) {
    return String(value || '').slice(0, 8);
  }
}
