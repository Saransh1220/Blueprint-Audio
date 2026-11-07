import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { SystemRole } from '../models';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const api = { execute: vi.fn() };
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    api.execute.mockReturnValue(of({}));
    TestBed.configureTestingModule({ providers: [{ provide: ApiService, useValue: api }] });
    service = TestBed.inject(AdminService);
  });

  const sent = () => api.execute.mock.calls[0][0];

  it.each([
    ['getUsers', '/admin/users'],
    ['getSpecs', '/admin/specs'],
    ['getOrders', '/admin/orders'],
    ['getLicenses', '/admin/licenses'],
    ['getAuditLog', '/admin/audit-log'],
  ] as const)('%s forwards the UI-chosen page, size and search', (method, path) => {
    service[method]({ page: 2, limit: 5, q: 'x' }).subscribe();

    expect(sent().path).toBe(path);
    expect(sent().params.get('page')).toBe('2');
    expect(sent().params.get('limit')).toBe('5');
    expect(sent().params.get('q')).toBe('x');
  });

  it('requests the overview and sends the update requests', () => {
    service.getOverview().subscribe();
    expect(sent().path).toBe('/admin/analytics/overview');

    api.execute.mockClear();
    service.setUserSystemRole('u1', SystemRole.USER).subscribe();
    expect(sent().body).toEqual({ system_role: 'user' });

    api.execute.mockClear();
    service.setUserStatus('u1', 'active').subscribe();
    expect(sent().body).toEqual({ status: 'active' });

    api.execute.mockClear();
    service.setSpecDeleted('s1', false).subscribe();
    expect(sent().path).toBe('/admin/specs/s1');
    expect(sent().body).toEqual({ is_deleted: false });
  });
});
