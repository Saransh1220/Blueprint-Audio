import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { SystemRole } from '../models';
import { AuthService } from '../services/auth.service';
import { AuthzService } from '../services/authz.service';

export const adminGuard: CanActivateFn = () => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const authz = inject(AuthzService);

  if (authz.isSuperAdmin()) {
    return true;
  }

  if (localStorage.getItem('token')) {
    return auth.getMe().pipe(
      map((user) =>
        user?.system_role === SystemRole.SUPER_ADMIN ? true : router.createUrlTree(['/']),
      ),
      catchError(() => of(router.createUrlTree(['/']))),
    );
  }

  return router.createUrlTree(['/']);
};
