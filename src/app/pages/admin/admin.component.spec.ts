import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AdminService } from '../../services/admin.service';
import { AuthzService } from '../../services/authz.service';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { AdminComponent } from './admin.component';
import { entry, license, order, pageOf, spec, user } from './admin.fixtures';
import { findAdminSection } from './admin-sections';

describe('AdminComponent', () => {
  const admin = {
    getOverview: vi.fn(),
    getUsers: vi.fn(),
    getSpecs: vi.fn(),
    getOrders: vi.fn(),
    getLicenses: vi.fn(),
    getAuditLog: vi.fn(),
    setUserSystemRole: vi.fn(),
    setUserStatus: vi.fn(),
    setSpecDeleted: vi.fn(),
  };

  function render() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ToastService, useValue: { error: vi.fn(), show: vi.fn() } },
        { provide: AuthzService, useValue: { isSuperAdmin: vi.fn(() => false) } },
        { provide: PaymentService, useValue: { refundOrder: vi.fn(), getOrderRefunds: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    return fixture;
  }

  const el = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;
  const links = (fixture: { nativeElement: unknown }) =>
    Array.from(el(fixture).querySelectorAll('.rail-link')) as HTMLButtonElement[];

  beforeEach(() => {
    vi.clearAllMocks();
    admin.getOverview.mockReturnValue(
      of({ users: 12, producers: 3, specs: 30, orders: 48, paid_orders: 24, revenue: 12345 }),
    );
    admin.getUsers.mockReturnValue(of(pageOf([user()])));
    admin.getSpecs.mockReturnValue(of(pageOf([spec()])));
    admin.getOrders.mockReturnValue(of(pageOf([order()])));
    admin.getLicenses.mockReturnValue(of(pageOf([license()])));
    admin.getAuditLog.mockReturnValue(of(pageOf([entry()])));
  });

  afterEach(() => document.body.classList.remove('admin-page-active'));

  it('switches off the film grain while the console is open, and back on after', () => {
    const fixture = render();
    expect(document.body.classList.contains('admin-page-active')).toBe(true);

    fixture.destroy();
    expect(document.body.classList.contains('admin-page-active')).toBe(false);
  });

  it('opens on the overview and loads the platform totals', () => {
    const fixture = render();

    expect(admin.getOverview).toHaveBeenCalledTimes(1);
    expect(el(fixture).querySelector('h1')?.textContent).toBe('Overview');
    expect(el(fixture).querySelector('app-admin-overview')).not.toBeNull();
    expect(fixture.componentInstance.overview().users).toBe(12);
  });

  it('groups the sidebar into Workspace, Manage and Security, each item with an icon', () => {
    const fixture = render();
    const groups = Array.from(el(fixture).querySelectorAll('.rail-group')).map(
      (g) => g.textContent,
    );

    expect(groups).toEqual(['Workspace', 'Manage', 'Security']);
    expect(links(fixture).map((l) => l.querySelector('.rail-label')?.textContent)).toEqual([
      'Overview',
      'Users',
      'Catalog',
      'Orders',
      'Licenses',
      'Audit log',
    ]);
    expect(links(fixture).every((l) => l.querySelector('i.fa-solid'))).toBe(true);
  });

  it('shows the totals next to the items that have one', () => {
    const fixture = render();
    const counts = links(fixture).map((l) => l.querySelector('.rail-count')?.textContent ?? null);

    expect(counts).toEqual([null, '12', '30', '48', null, null]);
  });

  it('omits the sidebar counts until the totals arrive', () => {
    admin.getOverview.mockReturnValue(throwError(() => new Error('x')));
    const fixture = render();

    expect(el(fixture).querySelectorAll('.rail-count').length).toBe(0);
    expect(fixture.componentInstance.overviewFailed()).toBe(true);
  });

  it('opens each section from the sidebar and marks the active one', () => {
    const fixture = render();
    const expected: [number, string, string][] = [
      [1, 'Users', 'app-admin-users'],
      [2, 'Catalog', 'app-admin-catalog'],
      [3, 'Orders', 'app-admin-orders'],
      [4, 'Licenses', 'app-admin-licenses'],
      [5, 'Audit log', 'app-admin-audit'],
      [0, 'Overview', 'app-admin-overview'],
    ];

    for (const [index, title, selector] of expected) {
      links(fixture)[index].click();
      fixture.detectChanges();

      expect(el(fixture).querySelector('h1')?.textContent).toBe(title);
      expect(el(fixture).querySelector(selector)).not.toBeNull();
      expect(links(fixture)[index].classList).toContain('active');
      expect(links(fixture)[index].getAttribute('aria-current')).toBe('page');
      expect(links(fixture).filter((l) => l.classList.contains('active')).length).toBe(1);
    }
  });

  it('reloads the totals when coming back to the overview', () => {
    const fixture = render();
    links(fixture)[1].click();
    fixture.detectChanges();
    admin.getOverview.mockClear();

    links(fixture)[0].click();

    expect(admin.getOverview).toHaveBeenCalledTimes(1);
  });

  it('retries a failed overview and clears the failure', () => {
    admin.getOverview.mockReturnValueOnce(throwError(() => new Error('x')));
    const fixture = render();
    expect(fixture.componentInstance.overviewFailed()).toBe(true);

    fixture.componentInstance.loadOverview();

    expect(fixture.componentInstance.overviewFailed()).toBe(false);
    expect(fixture.componentInstance.overview().users).toBe(12);
  });

  it('follows "View all" links from the overview to the right section', () => {
    const fixture = render();
    const viewAll = Array.from(
      el(fixture).querySelectorAll('app-admin-overview .panel-head .link'),
    ) as HTMLElement[];

    viewAll[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.activeTab()).toBe('orders');

    links(fixture)[0].click();
    fixture.detectChanges();
    (
      el(fixture).querySelectorAll('app-admin-overview .panel-head .link')[1] as HTMLElement
    ).click();
    expect(fixture.componentInstance.activeTab()).toBe('audit');
  });
});

describe('findAdminSection', () => {
  it('falls back to the overview for an unknown tab', () => {
    expect(findAdminSection('users').label).toBe('Users');
    expect(findAdminSection('nope' as never).label).toBe('Overview');
  });
});
