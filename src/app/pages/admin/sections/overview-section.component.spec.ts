import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { entry, order, pageOf } from '../admin.fixtures';
import { AdminOverviewSectionComponent } from './overview-section.component';

describe('AdminOverviewSectionComponent', () => {
  const admin = { getOrders: vi.fn(), getAuditLog: vi.fn() };

  function render(inputs: Record<string, unknown> = {}) {
    TestBed.configureTestingModule({ providers: [{ provide: AdminService, useValue: admin }] });
    const fixture = TestBed.createComponent(AdminOverviewSectionComponent);
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    fixture.detectChanges();
    return fixture;
  }

  const host = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement;

  beforeEach(() => {
    vi.clearAllMocks();
    admin.getOrders.mockReturnValue(of(pageOf([order()])));
    admin.getAuditLog.mockReturnValue(of(pageOf([entry()])));
  });

  it('asks for 5 recent orders and 5 recent audit entries', () => {
    render();
    expect(admin.getOrders).toHaveBeenCalledWith({ page: 1, limit: 5, q: '' });
    expect(admin.getAuditLog).toHaveBeenCalledWith({ page: 1, limit: 5, q: '' });
  });

  it('shows the five totals as stat cards, with the revenue caveat', () => {
    const fixture = render({
      overview: { users: 1204, producers: 15, specs: 30, paid_orders: 24, revenue: 6777500 },
    });
    const cards = host(fixture).querySelectorAll('app-admin-stat-card');
    const text = host(fixture).textContent ?? '';

    expect(cards.length).toBe(5);
    expect(text).toContain(new Intl.NumberFormat().format(1204));
    expect(text).toContain('67,775.00');
    expect(text).toContain('Summed across all currencies');
  });

  it('shows recent orders with an icon for their status, and recent activity', () => {
    const fixture = render();
    const el = host(fixture);

    expect(el.textContent).toContain('Recent orders');
    expect(el.textContent).toContain('buyer@test.dev');
    expect(el.querySelector('.feed-icon[data-tone="ok"] i')?.classList).toContain('fa-check');
    expect(el.textContent).toContain('Changed account status');
    expect(el.textContent).toContain('root@test.dev');
  });

  it('shows empty and error notes for the feeds', () => {
    admin.getOrders.mockReturnValue(of(pageOf([])));
    admin.getAuditLog.mockReturnValue(throwError(() => new Error('x')));
    const text = host(render()).textContent ?? '';

    expect(text).toContain('No orders yet.');
    expect(text).toContain('Could not load activity.');
  });

  it('shows an error note for orders, and an empty note for activity', () => {
    admin.getOrders.mockReturnValue(throwError(() => new Error('x')));
    admin.getAuditLog.mockReturnValue(of(pageOf([])));
    const text = host(render()).textContent ?? '';

    expect(text).toContain('Could not load orders.');
    expect(text).toContain('No administrator activity yet.');
  });

  it('offers a retry when the totals failed to load', () => {
    const fixture = render({ failed: true });
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);

    expect(host(fixture).textContent).toContain('Could not load the platform totals.');
    (host(fixture).querySelector('.notice .link') as HTMLButtonElement).click();
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('opens the orders and audit sections from "View all"', () => {
    const fixture = render();
    const opened: string[] = [];
    fixture.componentInstance.open.subscribe((tab) => opened.push(tab));

    const links = Array.from(host(fixture).querySelectorAll('.panel-head .link')) as HTMLElement[];
    links[0].click();
    links[1].click();

    expect(opened).toEqual(['orders', 'audit']);
  });

  it('cancels its requests when destroyed', () => {
    const pending = new Subject<ReturnType<typeof pageOf>>();
    admin.getOrders.mockReturnValue(pending);
    admin.getAuditLog.mockReturnValue(pending);
    const fixture = render();

    fixture.destroy();
    pending.next(pageOf([order()]));

    expect(fixture.componentInstance.orders.items()).toEqual([]);
  });
});
