import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Role, SystemRole, User } from '../models';
import { AuthService } from '../services/auth.service';
import { AuthzService } from '../services/authz.service';
import { SessionStateService } from '../core/services/session-state.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const authz = {
    isSuperAdmin: vi.fn(),
  };

  let sessionState: SessionStateService;

  beforeEach(() => {
    authz.isSuperAdmin.mockReset();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sessionReady: Promise.resolve(null) } },
        { provide: AuthzService, useValue: authz },
        SessionStateService,
      ],
    });
    sessionState = TestBed.inject(SessionStateService);
  });

  it('allows activation when authz already knows the user is super admin', async () => {
    authz.isSuperAdmin.mockReturnValue(true);

    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('allows activation when current user has super admin role', async () => {
    authz.isSuperAdmin.mockReturnValue(false);
    sessionState.setVerified({
      id: 'admin-1',
      name: 'Admin',
      display_name: 'Super',
      email: 'admin@example.com',
      role: Role.PRODUCER,
      system_role: SystemRole.SUPER_ADMIN,
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects when user is not super admin', async () => {
    authz.isSuperAdmin.mockReturnValue(false);
    sessionState.setVerified({
      id: 'user-1',
      name: 'User',
      display_name: 'Regular',
      email: 'user@example.com',
      role: Role.PRODUCER,
      system_role: SystemRole.USER,
      status: 'active',
      email_verified: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    const router = TestBed.inject(Router);

    const result = await TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/');
  });
});
