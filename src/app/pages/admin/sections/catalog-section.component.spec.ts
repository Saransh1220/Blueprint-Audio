import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdminSpec } from '../../../models';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { pageOf, spec } from '../admin.fixtures';
import { AdminCatalogSectionComponent } from './catalog-section.component';

describe('AdminCatalogSectionComponent', () => {
  const admin = { getSpecs: vi.fn(), setSpecDeleted: vi.fn() };
  const toast = { error: vi.fn() };

  function render(specs: AdminSpec[] = [spec()]) {
    admin.getSpecs.mockReturnValue(of(pageOf(specs)));
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(AdminCatalogSectionComponent);
    fixture.detectChanges();
    return fixture;
  }

  const el = (fixture: ComponentFixture<unknown>) => fixture.nativeElement as HTMLElement;
  const hideButton = (fixture: ComponentFixture<unknown>) =>
    el(fixture).querySelector('tbody .row-btn') as HTMLButtonElement;

  beforeEach(() => vi.clearAllMocks());

  it('lists each spec with its producer, price and status', () => {
    const fixture = render([spec(), spec({ id: 's2', title: 'Hidden One', is_deleted: true })]);
    const rows = el(fixture).querySelectorAll('tbody tr');

    expect(admin.getSpecs).toHaveBeenCalledWith({ page: 1, limit: 10, q: '' });
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('Night Drive');
    expect(rows[0].textContent).toContain('#s1');
    expect(rows[0].textContent).toContain('29.99');
    expect(rows[0].textContent).toContain('Completed');
    expect(rows[0].querySelector('.avatar')?.textContent).toBe('AL');
    expect(rows[1].textContent).toContain('Hidden');
    expect(rows[1].textContent).toContain('Restore');
  });

  it('hides a spec, merging the server fields', () => {
    const fixture = render();
    admin.setSpecDeleted.mockReturnValue(of({ is_deleted: true }));

    hideButton(fixture).click();
    fixture.detectChanges();

    expect(admin.setSpecDeleted).toHaveBeenCalledWith('s1', true);
    expect(el(fixture).textContent).toContain('Hidden');
    expect(hideButton(fixture).textContent).toContain('Restore');
  });

  it('restores a hidden spec', () => {
    const fixture = render([spec({ is_deleted: true })]);
    admin.setSpecDeleted.mockReturnValue(of({ is_deleted: false }));

    hideButton(fixture).click();

    expect(admin.setSpecDeleted).toHaveBeenCalledWith('s1', false);
  });

  it('disables the row while the update is in flight', () => {
    const fixture = render();
    const inflight = new Subject<Partial<AdminSpec>>();
    admin.setSpecDeleted.mockReturnValue(inflight);

    hideButton(fixture).click();
    fixture.detectChanges();
    expect(hideButton(fixture).disabled).toBe(true);

    inflight.next({ is_deleted: true });
    fixture.detectChanges();
    expect(hideButton(fixture).disabled).toBe(false);
  });

  it('rolls a hide back and says so when it fails', () => {
    const fixture = render();
    admin.setSpecDeleted.mockReturnValue(throwError(() => new Error('x')));

    hideButton(fixture).click();
    fixture.detectChanges();

    expect(toast.error).toHaveBeenCalledWith('Could not update the spec.');
    expect(hideButton(fixture).textContent).toContain('Hide');
    expect(fixture.componentInstance.isPending('s1')).toBe(false);
  });

  it('cancels its request when destroyed', () => {
    const pending = new Subject<ReturnType<typeof pageOf<AdminSpec>>>();
    admin.getSpecs.mockReturnValue(pending);
    TestBed.configureTestingModule({
      providers: [
        { provide: AdminService, useValue: admin },
        { provide: ToastService, useValue: toast },
      ],
    });
    const fixture = TestBed.createComponent(AdminCatalogSectionComponent);
    fixture.detectChanges();

    fixture.destroy();
    pending.next(pageOf([spec()]));

    expect(fixture.componentInstance.list.items()).toEqual([]);
  });
});
