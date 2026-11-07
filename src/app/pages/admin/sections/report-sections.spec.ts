import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { entry, license, order, pageOf } from '../admin.fixtures';
import { AdminAuditSectionComponent } from './audit-section.component';
import { AdminLicensesSectionComponent } from './licenses-section.component';
import { AdminOrdersSectionComponent } from './orders-section.component';

// The read-only sections share one shape: load on show, list rows, cancel on destroy.
describe('read-only admin sections', () => {
  const admin = { getOrders: vi.fn(), getLicenses: vi.fn(), getAuditLog: vi.fn() };

  function render<T>(component: Type<T>) {
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: admin }] });
    const fixture = TestBed.createComponent(component);
    fixture.detectChanges();
    return fixture;
  }

  const text = (fixture: { nativeElement: unknown }) =>
    (fixture.nativeElement as HTMLElement).textContent?.replace(/\s+/g, ' ') ?? '';

  beforeEach(() => vi.clearAllMocks());

  describe('orders', () => {
    it('lists orders with the amount in their own currency and a status badge', () => {
      admin.getOrders.mockReturnValue(
        of(
          pageOf([order(), order({ id: 'o2', status: 'refunded', amount: 2500, currency: 'USD' })]),
        ),
      );
      const fixture = render(AdminOrdersSectionComponent);
      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');

      expect(admin.getOrders).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
      expect(rows.length).toBe(2);
      expect(rows[0].textContent).toContain('Night Drive');
      expect(rows[0].textContent).toContain('buyer@test.dev');
      expect(rows[0].textContent).toContain('1,500.00');
      expect(rows[0].textContent).toContain('Paid');
      expect(rows[1].textContent).toContain('25.00');
      expect(rows[1].textContent).toContain('Refunded');
    });

    it('cancels its request when destroyed', () => {
      const pending = new Subject<ReturnType<typeof pageOf>>();
      admin.getOrders.mockReturnValue(pending);
      const fixture = render(AdminOrdersSectionComponent);

      fixture.destroy();
      pending.next(pageOf([order()]));

      expect(fixture.componentInstance.list.items()).toEqual([]);
    });
  });

  describe('licenses', () => {
    it('lists licenses with downloads and a status', () => {
      admin.getLicenses.mockReturnValue(
        of(pageOf([license(), license({ id: 'l2', is_revoked: true, downloads_count: 1204 })])),
      );
      const fixture = render(AdminLicensesSectionComponent);
      const rows = (fixture.nativeElement as HTMLElement).querySelectorAll('tbody tr');

      expect(admin.getLicenses).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
      expect(rows[0].textContent).toContain('buyer@test.dev');
      expect(rows[0].textContent).toContain('1,500.00');
      expect(rows[0].textContent).toContain('Active');
      expect(rows[1].textContent).toContain(new Intl.NumberFormat().format(1204));
      expect(rows[1].textContent).toContain('Revoked');
    });

    it('cancels its request when destroyed', () => {
      const pending = new Subject<ReturnType<typeof pageOf>>();
      admin.getLicenses.mockReturnValue(pending);
      const fixture = render(AdminLicensesSectionComponent);

      fixture.destroy();
      pending.next(pageOf([license()]));

      expect(fixture.componentInstance.list.items()).toEqual([]);
    });
  });

  describe('audit log', () => {
    it('lists entries with an icon, a readable action and the raw action underneath', () => {
      admin.getAuditLog.mockReturnValue(
        of(
          pageOf([
            entry({ ip_address: '10.0.0.1/32' }),
            entry({ id: 'a2', actor_email: null, resource_id: null, ip_address: null }),
          ]),
        ),
      );
      const fixture = render(AdminAuditSectionComponent);
      const host = fixture.nativeElement as HTMLElement;
      const rows = host.querySelectorAll('tbody tr');

      expect(admin.getAuditLog).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
      expect(rows[0].querySelector('.feed-icon i')?.classList).toContain('fa-user-lock');
      expect(rows[0].textContent).toContain('Changed account status');
      expect(rows[0].textContent).toContain('users.set_status');
      expect(rows[0].textContent).toContain('root@test.dev');
      expect(rows[0].textContent).toContain('#abcdef12');
      expect(rows[0].textContent).toContain('10.0.0.1');
      expect(rows[0].textContent).not.toContain('/32');

      expect(rows[1].textContent).toContain('System');
      expect(rows[1].textContent).toContain('—');
      expect(text(fixture)).not.toContain('#undefined');
    });

    it('cancels its request when destroyed', () => {
      const pending = new Subject<ReturnType<typeof pageOf>>();
      admin.getAuditLog.mockReturnValue(pending);
      const fixture = render(AdminAuditSectionComponent);

      fixture.destroy();
      pending.next(pageOf([entry()]));

      expect(fixture.componentInstance.list.items()).toEqual([]);
    });
  });
});
