import { HttpParams } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ApiService } from '../../core/services/api.service';
import { SystemRole } from '../../models';
import { AdminComponent } from './admin.component';

describe('AdminComponent', () => {
  const api = {
    get: vi.fn(),
    patch: vi.fn(),
  };

  function create() {
    TestBed.configureTestingModule({
      providers: [{ provide: ApiService, useValue: api }],
    });
    return TestBed.runInInjectionContext(() => new AdminComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url: string) => {
      if (url === '/admin/analytics/overview') return of({ revenue: 12345, users: 2 });
      return of({ data: [], metadata: { total: 0, page: 1, per_page: 25 } });
    });
    api.patch.mockImplementation((_url: string, body: Record<string, unknown>) =>
      of({
        id: 'u1',
        email: 'a@test.dev',
        system_role: body['system_role'],
        status: body['status'],
      }),
    );
  });

  it('loads overview and users on init with search params', () => {
    const component = create();
    component.search.set('  blaze  ');

    component.ngOnInit();

    expect(api.get).toHaveBeenCalledWith('/admin/analytics/overview');
    const usersCall = api.get.mock.calls.find(([url]) => url === '/admin/users');
    expect(usersCall?.[1]).toBeInstanceOf(HttpParams);
    expect((usersCall?.[1] as HttpParams).get('q')).toBe('blaze');
    expect(component.paidRevenue()).toBe('123.45');
    expect(component.loading()).toBe(false);
  });

  it('switches tabs and stores page data from each admin endpoint', () => {
    api.get.mockImplementation((url: string) =>
      of({ data: [{ id: url }], metadata: { total: 1, page: 1, per_page: 25 } }),
    );
    const component = create();

    component.setTab('specs');
    component.setTab('orders');
    component.setTab('licenses');
    component.setTab('audit');

    expect(component.activeTab()).toBe('audit');
    expect(component.specs()[0]['id']).toBe('/admin/specs');
    expect(component.orders()[0]['id']).toBe('/admin/orders');
    expect(component.licenses()[0]['id']).toBe('/admin/licenses');
    expect(component.auditLogs()[0]['id']).toBe('/admin/audit-log');
  });

  it('updates user role and status, rolling status back on failure', () => {
    const component = create();
    const user = {
      id: 'u1',
      email: 'a@test.dev',
      name: 'A',
      role: 'producer',
      system_role: SystemRole.USER,
      status: 'active',
      email_verified: true,
      created_at: 'today',
    } as any;
    component.users.set([user]);

    api.patch.mockReturnValueOnce(of({ ...user, system_role: SystemRole.SUPER_ADMIN }));
    component.setSuperAdmin(user, true);
    expect(api.patch).toHaveBeenCalledWith('/admin/users/u1/system-role', {
      system_role: SystemRole.SUPER_ADMIN,
    });
    expect(component.users()[0].system_role).toBe(SystemRole.SUPER_ADMIN);

    api.patch.mockReturnValueOnce(throwError(() => new Error('nope')));
    component.setUserStatus(user, 'suspended');

    expect(component.users()[0].status).toBe('active');
  });

  it('toggles spec deletion optimistically and restores on error', () => {
    const component = create();
    component.specs.set([{ id: 's1', is_deleted: false, title: 'Talk' }]);

    api.patch.mockReturnValueOnce(of({ title: 'Talk Updated', is_deleted: true }));
    component.toggleSpecDeleted(component.specs()[0]);
    expect(component.specs()[0]['is_deleted']).toBe(true);
    expect(component.specs()[0]['title']).toBe('Talk Updated');

    api.patch.mockReturnValueOnce(throwError(() => new Error('nope')));
    component.toggleSpecDeleted(component.specs()[0]);
    expect(component.specs()[0]['is_deleted']).toBe(true);
  });

  it('handles load errors, missing data and overview/users tabs', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = create();
    api.get.mockImplementation(() => throwError(() => new Error('x')));
    for (const tab of ['overview', 'users', 'specs', 'orders', 'licenses', 'audit'] as const) {
      component.setTab(tab);
      expect(component.loading()).toBe(false);
    }
    expect(component.activeTab()).toBe('audit');

    api.get.mockImplementation(() => of({}));
    component.setTab('users');
    component.setTab('specs');
    component.setTab('orders');
    component.setTab('licenses');
    component.setTab('audit');
    expect(component.users()).toEqual([]);
    expect(component.specs()).toEqual([]);
    expect(component.orders()).toEqual([]);
    expect(component.licenses()).toEqual([]);
    expect(component.auditLogs()).toEqual([]);

    api.get.mockImplementation(() => of({ revenue: 100 }));
    component.setTab('overview');
    expect(component.paidRevenue()).toBe('1.00');
    api.get.mockImplementation(() => of({}));
    component.setTab('overview');
    expect(component.paidRevenue()).toBe('0.00');
    errSpy.mockRestore();
  });

  it('demotes super admins, logs role failures and keeps other users on update', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = create();
    const u1 = { id: 'u1', status: 'active', system_role: SystemRole.SUPER_ADMIN } as any;
    const u2 = { id: 'u2', status: 'active', system_role: SystemRole.USER } as any;
    component.users.set([u1, u2]);

    api.patch.mockReturnValueOnce(of({ ...u1, system_role: SystemRole.USER }));
    component.setSuperAdmin(u1, false);
    expect(api.patch).toHaveBeenCalledWith('/admin/users/u1/system-role', {
      system_role: SystemRole.USER,
    });
    expect(component.users()[0].system_role).toBe(SystemRole.USER);
    expect(component.users()[1]).toEqual(u2);

    api.patch.mockReturnValueOnce(throwError(() => new Error('nope')));
    component.setSuperAdmin(u2, true);
    expect(errSpy).toHaveBeenCalled();

    api.patch.mockReturnValueOnce(of({ ...u2, status: 'suspended' }));
    component.setUserStatus(u2, 'suspended');
    expect(component.users()[1].status).toBe('suspended');
    expect(component.users()[0].id).toBe('u1');
    errSpy.mockRestore();
  });

  it('restores spec list and leaves other specs untouched', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = create();
    component.specs.set([
      { id: 's1', is_deleted: true },
      { id: 's2', is_deleted: false },
    ]);
    api.patch.mockReturnValueOnce(of({ is_deleted: false }));
    component.toggleSpecDeleted(component.specs()[0]);
    expect(component.specs()[0]['is_deleted']).toBe(false);
    expect(component.specs()[1]['is_deleted']).toBe(false);

    api.patch.mockReturnValueOnce(throwError(() => new Error('nope')));
    component.toggleSpecDeleted(component.specs()[1]);
    expect(component.specs()[1]['is_deleted']).toBe(false);
    expect(errSpy).toHaveBeenCalled();
    errSpy.mockRestore();
  });

  it('formats money and short ids', () => {
    const component = create();
    expect(component.formatMoney(null)).toBe('Rs 0.00');
    expect(component.formatMoney(899)).toBe('Rs 8.99');
    expect(component.shortId('abcdef123456')).toBe('abcdef12');
    expect(component.shortId(null)).toBe('');
  });
});
