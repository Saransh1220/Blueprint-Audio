import { Injectable, computed, inject } from '@angular/core';
import { SystemRole } from '../models';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthzService {
  private readonly authService = inject(AuthService);

  readonly isSuperAdmin = computed(
    () => this.authService.currentUser()?.system_role === SystemRole.SUPER_ADMIN,
  );

  hasSystemRole(role: SystemRole) {
    return this.authService.currentUser()?.system_role === role;
  }
}
