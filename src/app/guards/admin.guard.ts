import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { SystemRole } from '../models';
import { AuthService } from '../services/auth.service';
import { AuthzService } from '../services/authz.service';
import { SessionStateService } from '../core/services/session-state.service';

export const adminGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const authz = inject(AuthzService);
  const sessionState = inject(SessionStateService);

  await auth.sessionReady;

  if (authz.isSuperAdmin() || sessionState.currentUser()?.system_role === SystemRole.SUPER_ADMIN) {
    return true;
  }

  return router.createUrlTree(['/']);
};
