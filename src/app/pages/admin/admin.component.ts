import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { AdminOverview } from '../../models';
import { AdminService } from '../../services/admin.service';
import { formatNumber } from './admin-format';
import { ADMIN_SECTION_GROUPS, AdminTab, findAdminSection } from './admin-sections';
import { AdminAuditSectionComponent } from './sections/audit-section.component';
import { AdminCatalogSectionComponent } from './sections/catalog-section.component';
import { AdminLicensesSectionComponent } from './sections/licenses-section.component';
import { AdminOrdersSectionComponent } from './sections/orders-section.component';
import { AdminOverviewSectionComponent } from './sections/overview-section.component';
import { AdminUsersSectionComponent } from './sections/users-section.component';

export type { AdminTab } from './admin-sections';

/**
 * The super admin console: a section sidebar, a page header, and one component
 * per section. Each section owns its own list, paging and search.
 */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [
    AdminAuditSectionComponent,
    AdminCatalogSectionComponent,
    AdminLicensesSectionComponent,
    AdminOrdersSectionComponent,
    AdminOverviewSectionComponent,
    AdminUsersSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly document = inject(DOCUMENT);

  readonly groups = ADMIN_SECTION_GROUPS;
  readonly activeTab = signal<AdminTab>('overview');
  readonly activeSection = computed(() => findAdminSection(this.activeTab()));

  readonly overview = signal<AdminOverview>({});
  readonly overviewFailed = signal(false);

  ngOnInit() {
    // The console is a work surface: switch off the app-wide film grain.
    this.document.body.classList.add('admin-page-active');
    this.loadOverview();
  }

  ngOnDestroy() {
    this.document.body.classList.remove('admin-page-active');
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    if (tab === 'overview') this.loadOverview();
  }

  loadOverview() {
    this.overviewFailed.set(false);
    this.admin.getOverview().subscribe({
      next: (data) => this.overview.set(data),
      error: () => this.overviewFailed.set(true),
    });
  }

  /** The total shown next to a sidebar item, when the overview knows it. */
  count(tab: AdminTab): string | null {
    const totals = this.overview();
    const value =
      tab === 'users'
        ? totals.users
        : tab === 'specs'
          ? totals.specs
          : tab === 'orders'
            ? totals.orders
            : undefined;
    return value === undefined ? null : formatNumber(value);
  }
}
