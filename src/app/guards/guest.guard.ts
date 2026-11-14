import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SessionStateService } from '../core/services/session-state.service';

export const guestGuard: CanActivateFn = async (route, state) => {
  const router = inject(Router);
  const auth = inject(AuthService);
  const sessionState = inject(SessionStateService);

  await auth.sessionReady;

  if (sessionState.isVerified()) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
