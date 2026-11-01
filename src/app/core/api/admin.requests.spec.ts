import { SystemRole } from '../../models';
import {
  GetAdminAuditLogRequest,
  GetAdminLicensesRequest,
  GetAdminOrdersRequest,
  GetAdminOverviewRequest,
  GetAdminSpecsRequest,
  GetAdminUsersRequest,
  UpdateAdminSpecRequest,
  UpdateAdminUserStatusRequest,
  UpdateAdminUserSystemRoleRequest,
} from './admin.requests';

describe('admin requests', () => {
  const lists = [
    ['users', GetAdminUsersRequest, '/admin/users'],
    ['specs', GetAdminSpecsRequest, '/admin/specs'],
    ['orders', GetAdminOrdersRequest, '/admin/orders'],
    ['licenses', GetAdminLicensesRequest, '/admin/licenses'],
    ['audit log', GetAdminAuditLogRequest, '/admin/audit-log'],
  ] as const;

  it.each(lists)('builds the paged %s list from what the UI asks for', (_name, Request, path) => {
    const request = new Request({ page: 3, limit: 20, q: '  bob  ' });

    expect(request.method).toBe('GET');
    expect(request.path).toBe(path);
    expect(request.params.get('page')).toBe('3');
    expect(request.params.get('limit')).toBe('20');
    expect(request.params.get('q')).toBe('bob');
  });

  it.each(lists)('sends nothing the UI did not choose for %s', (_name, Request) => {
    expect(new Request().params.keys()).toEqual([]);
    expect(new Request({ page: 0, limit: 0, q: '   ' }).params.keys()).toEqual([]);
    expect(new Request({ limit: 5 }).params.keys()).toEqual(['limit']);
  });

  it('builds the overview request', () => {
    const request = new GetAdminOverviewRequest();
    expect(request.method).toBe('GET');
    expect(request.path).toBe('/admin/analytics/overview');
  });

  it('builds the user, status and spec update requests', () => {
    const role = new UpdateAdminUserSystemRoleRequest('u1', SystemRole.SUPER_ADMIN);
    expect(role.method).toBe('PATCH');
    expect(role.path).toBe('/admin/users/u1/system-role');
    expect(role.body).toEqual({ system_role: 'super_admin' });

    const status = new UpdateAdminUserStatusRequest('u1', 'suspended');
    expect(status.path).toBe('/admin/users/u1/status');
    expect(status.body).toEqual({ status: 'suspended' });

    const spec = new UpdateAdminSpecRequest('s1', true);
    expect(spec.method).toBe('PATCH');
    expect(spec.path).toBe('/admin/specs/s1');
    expect(spec.body).toEqual({ is_deleted: true });
  });
});
