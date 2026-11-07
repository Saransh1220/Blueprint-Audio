import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AdminListQuery,
  GetAdminAuditLogRequest,
  GetAdminLicensesRequest,
  GetAdminOrdersRequest,
  GetAdminOverviewRequest,
  GetAdminSpecsRequest,
  GetAdminUsersRequest,
  UpdateAdminSpecRequest,
  UpdateAdminUserStatusRequest,
  UpdateAdminUserSystemRoleRequest,
} from '../core/api/admin.requests';
import { ApiService } from '../core/services/api.service';
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
} from '../models';

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly api = inject(ApiService);

  getOverview(): Observable<AdminOverview> {
    return this.api.execute(new GetAdminOverviewRequest());
  }

  getUsers(query: AdminListQuery): Observable<PaginatedResponse<AdminUser>> {
    return this.api.execute(new GetAdminUsersRequest(query));
  }

  getSpecs(query: AdminListQuery): Observable<PaginatedResponse<AdminSpec>> {
    return this.api.execute(new GetAdminSpecsRequest(query));
  }

  getOrders(query: AdminListQuery): Observable<PaginatedResponse<AdminOrder>> {
    return this.api.execute(new GetAdminOrdersRequest(query));
  }

  getLicenses(query: AdminListQuery): Observable<PaginatedResponse<AdminLicense>> {
    return this.api.execute(new GetAdminLicensesRequest(query));
  }

  getAuditLog(query: AdminListQuery): Observable<PaginatedResponse<AdminAuditEntry>> {
    return this.api.execute(new GetAdminAuditLogRequest(query));
  }

  setUserSystemRole(userId: string, systemRole: SystemRole): Observable<AdminUser> {
    return this.api.execute(new UpdateAdminUserSystemRoleRequest(userId, systemRole));
  }

  setUserStatus(userId: string, status: AdminUserStatus): Observable<AdminUser> {
    return this.api.execute(new UpdateAdminUserStatusRequest(userId, status));
  }

  setSpecDeleted(specId: string, isDeleted: boolean): Observable<Partial<AdminSpec>> {
    return this.api.execute(new UpdateAdminSpecRequest(specId, isDeleted));
  }
}
