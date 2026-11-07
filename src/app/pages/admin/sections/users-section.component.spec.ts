import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdminUser, SystemRole } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { pageOf, user } from '../admin.fixtures';
import { AdminUsersSectionComponent } from './users-section.component';

describe('AdminUsersSectionComponent', () => {
  const admin = { getUsers: vi.fn(), setUserSystemRole: vi.fn(), setUserStatus: vi.fn() };
  const toast = { error: vi.fn() };

  function render(users: AdminUser[] = [user()], total = users.length) {
    admin.getUsers.mockReturnValue(of(pageOf(users, total)));
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(AdminUsersSectionComponent);
    fixture.detectChanges();
    return fixture;
  }

  const el = (fixture: ComponentFixture<unknown>) => fixture.nativeElement as HTMLElement;
  const buttons = (fixture: ComponentFixture<unknown>) =>
    Array.from(el(fixture).querySelectorAll('tbody .row-btn')) as HTMLButtonElement[];

  beforeEach(() => vi.clearAllMocks());

  it('loads the first page with the default size when it appears', () => {
    render();
    expect(admin.getUsers).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
  });

  it('lists each user with an avatar, role, access, status and verification', () => {
    const fixture = render([
      user(),
      user({
        id: 'u2',
        email: 'root@test.dev',
        name: 'Root',
        system_role: SystemRole.SUPER_ADMIN,
        status: 'suspended',
        email_verified: false,
      }),
    ]);
    const rows = el(fixture).querySelectorAll('tbody tr');

    expect(rows.length).toBe(2);
    expect(rows[0].querySelector('.avatar')?.textContent).toBe('AL');
    expect(rows[0].textContent).toContain('Producer');
    expect(rows[0].textContent).toContain('Active');
    expect(rows[0].textContent).toContain('Verified');
    expect(rows[0].querySelector('.role-chip')).toBeNull();

    expect(rows[1].querySelector('.role-chip')?.textContent).toContain('Super admin');
    expect(rows[1].textContent).toContain('Suspended');
    expect(rows[1].textContent).toContain('Unverified');
    expect(rows[1].textContent).toContain('Revoke super admin');
    expect(rows[1].textContent).toContain('Reactivate');
  });

  it('grants super admin and replaces the row with the server copy', () => {
    const fixture = render();
    admin.setUserSystemRole.mockReturnValue(of(user({ system_role: SystemRole.SUPER_ADMIN })));

    buttons(fixture)[0].click();
    fixture.detectChanges();

    expect(admin.setUserSystemRole).toHaveBeenCalledWith('u1', SystemRole.SUPER_ADMIN);
    expect(el(fixture).querySelector('.role-chip')).not.toBeNull();
  });

  it('revokes super admin', () => {
    const fixture = render([user({ system_role: SystemRole.SUPER_ADMIN })]);
    admin.setUserSystemRole.mockReturnValue(of(user()));

    buttons(fixture)[0].click();

    expect(admin.setUserSystemRole).toHaveBeenCalledWith('u1', SystemRole.USER);
  });

  it('shows the server reason when a role change is refused', () => {
    const fixture = render();
    admin.setUserSystemRole.mockReturnValue(
      throwError(() => ({ error: { error: 'cannot remove the last super admin' } })),
    );

    buttons(fixture)[0].click();

    expect(toast.error).toHaveBeenCalledWith('Cannot remove the last super admin.');
    expect(fixture.componentInstance.isPending('u1')).toBe(false);
  });

  it('falls back to a generic message when the server gives no reason', () => {
    const fixture = render();
    admin.setUserSystemRole.mockReturnValue(throwError(() => new Error('network')));

    buttons(fixture)[0].click();

    expect(toast.error).toHaveBeenCalledWith('Could not change the role.');
  });

  it('disables a row while its update is in flight so a double click cannot send two', () => {
    const fixture = render();
    const inflight = new Subject<AdminUser>();
    admin.setUserSystemRole.mockReturnValue(inflight);

    buttons(fixture)[0].click();
    fixture.detectChanges();
    expect(fixture.componentInstance.isPending('u1')).toBe(true);
    expect(buttons(fixture).every((b) => b.disabled)).toBe(true);

    inflight.next(user({ system_role: SystemRole.SUPER_ADMIN }));
    fixture.detectChanges();
    expect(fixture.componentInstance.isPending('u1')).toBe(false);
    expect(buttons(fixture).some((b) => b.disabled)).toBe(false);
  });

  it('suspends optimistically and keeps the server result', () => {
    const fixture = render();
    const inflight = new Subject<AdminUser>();
    admin.setUserStatus.mockReturnValue(inflight);

    buttons(fixture)[1].click();
    fixture.detectChanges();
    expect(admin.setUserStatus).toHaveBeenCalledWith('u1', 'suspended');
    expect(el(fixture).querySelector('tbody')?.textContent).toContain('Suspended');

    inflight.next(user({ status: 'suspended' }));
    fixture.detectChanges();
    expect(el(fixture).querySelector('tbody')?.textContent).toContain('Suspended');
  });

  it('reactivates a suspended user', () => {
    const fixture = render([user({ status: 'suspended' })]);
    admin.setUserStatus.mockReturnValue(of(user()));

    buttons(fixture)[1].click();

    expect(admin.setUserStatus).toHaveBeenCalledWith('u1', 'active');
  });

  it('rolls a status change back and explains when it fails', () => {
    const fixture = render();
    admin.setUserStatus.mockReturnValue(
      throwError(() => ({ error: { error: 'cannot suspend the last super admin' } })),
    );

    buttons(fixture)[1].click();
    fixture.detectChanges();

    expect(el(fixture).querySelector('tbody')?.textContent).toContain('Active');
    expect(toast.error).toHaveBeenCalledWith('Cannot suspend the last super admin.');
  });

  it('uses a generic message for a status failure without a reason', () => {
    const fixture = render();
    admin.setUserStatus.mockReturnValue(throwError(() => new Error('x')));

    buttons(fixture)[1].click();

    expect(toast.error).toHaveBeenCalledWith('Could not change the account status.');
  });

  it('cancels its request when destroyed', () => {
    const pending = new Subject<ReturnType<typeof pageOf<AdminUser>>>();
    admin.getUsers.mockReturnValue(pending);
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(AdminUsersSectionComponent);
    fixture.detectChanges();

    fixture.destroy();
    pending.next(pageOf([user()]));

    expect(fixture.componentInstance.list.items()).toEqual([]);
  });
});
