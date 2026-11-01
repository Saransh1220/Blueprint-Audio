import { HttpParams } from '@angular/common/http';
import type {
  AdminAuditEntry,
  AdminLicense,
  AdminOrder,
  AdminOverview,
  AdminSpec,
  AdminUser,
  AdminUserStatus,
  PaginatedResponse,
  SystemRole,
} from '../../models';
import type { ApiRequest, HttpMethod } from './api-request';

/**
 * Paging and search are chosen by the UI. The server only supplies a default
 * page size (when none is sent) and a safety ceiling.
 */
export interface AdminListQuery {
  page?: number;
  limit?: number;
  q?: string;
}

function listParams(query: AdminListQuery): HttpParams {
  let params = new HttpParams();
  if (query.page && query.page > 0) params = params.set('page', query.page);
  if (query.limit && query.limit > 0) params = params.set('limit', query.limit);
  const search = query.q?.trim();
  if (search) params = params.set('q', search);
  return params;
}

abstract class AdminListRequest<T> implements ApiRequest<PaginatedResponse<T>> {
  abstract readonly path: string;
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: PaginatedResponse<T>;
  readonly params: HttpParams;

  constructor(query: AdminListQuery = {}) {
    this.params = listParams(query);
  }
}

export class GetAdminUsersRequest extends AdminListRequest<AdminUser> {
  readonly path = '/admin/users';
}

export class GetAdminSpecsRequest extends AdminListRequest<AdminSpec> {
  readonly path = '/admin/specs';
}

export class GetAdminOrdersRequest extends AdminListRequest<AdminOrder> {
  readonly path = '/admin/orders';
}

export class GetAdminLicensesRequest extends AdminListRequest<AdminLicense> {
  readonly path = '/admin/licenses';
}

export class GetAdminAuditLogRequest extends AdminListRequest<AdminAuditEntry> {
  readonly path = '/admin/audit-log';
}

export class GetAdminOverviewRequest implements ApiRequest<AdminOverview> {
  readonly path = '/admin/analytics/overview';
  readonly method: HttpMethod = 'GET';
  readonly _responseType?: AdminOverview;
}

export class UpdateAdminUserSystemRoleRequest implements ApiRequest<AdminUser> {
  readonly method: HttpMethod = 'PATCH';
  readonly _responseType?: AdminUser;
  readonly path: string;
  readonly body: { system_role: SystemRole };

  constructor(userId: string, systemRole: SystemRole) {
    this.path = `/admin/users/${userId}/system-role`;
    this.body = { system_role: systemRole };
  }
}

export class UpdateAdminUserStatusRequest implements ApiRequest<AdminUser> {
  readonly method: HttpMethod = 'PATCH';
  readonly _responseType?: AdminUser;
  readonly path: string;
  readonly body: { status: AdminUserStatus };

  constructor(userId: string, status: AdminUserStatus) {
    this.path = `/admin/users/${userId}/status`;
    this.body = { status };
  }
}

export class UpdateAdminSpecRequest implements ApiRequest<Partial<AdminSpec>> {
  readonly method: HttpMethod = 'PATCH';
  readonly _responseType?: Partial<AdminSpec>;
  readonly path: string;
  readonly body: { is_deleted: boolean };

  constructor(specId: string, isDeleted: boolean) {
    this.path = `/admin/specs/${specId}`;
    this.body = { is_deleted: isDeleted };
  }
}
