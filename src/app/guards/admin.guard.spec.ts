import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, of, throwError } from 'rxjs';
import { SystemRole } from '../models';
import { AuthService } from '../services/auth.service';
import { AuthzService } from '../services/authz.service';
import { adminGuard } from './admin.guard';

describe('adminGuard', () => {
  const auth = {
    getMe: vi.fn(),
  };
  const authz = {
    isSuperAdmin: vi.fn(),
  };

  beforeEach(() => {
    auth.getMe.mockReset();
    authz.isSuperAdmin.mockReset();
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: AuthzService, useValue: authz },
      ],
    });
  });

  it('allows activation when authz already knows the user is super admin', () => {
    authz.isSuperAdmin.mockReturnValue(true);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    expect(result).toBe(true);
    expect(auth.getMe).not.toHaveBeenCalled();
  });

  it('loads current user when token exists and allows super admin role', async () => {
    authz.isSuperAdmin.mockReturnValue(false);
    localStorage.setItem('token', 'abc');
    auth.getMe.mockReturnValue(of({ system_role: SystemRole.SUPER_ADMIN }));

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));

    await expect(firstValueFrom(result as any)).resolves.toBe(true);
  });

  it('redirects when token exists but user is not super admin', async () => {
    authz.isSuperAdmin.mockReturnValue(false);
    localStorage.setItem('token', 'abc');
    auth.getMe.mockReturnValue(of({ system_role: SystemRole.USER }));
    const router = TestBed.inject(Router);

    const result = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    const tree = await firstValueFrom(result as any);

    expect(tree instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(tree)).toBe('/');
  });

  it('redirects without token or when getMe fails', async () => {
    authz.isSuperAdmin.mockReturnValue(false);
    const router = TestBed.inject(Router);

    const noToken = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    expect(router.serializeUrl(noToken as UrlTree)).toBe('/');

    localStorage.setItem('token', 'abc');
    auth.getMe.mockReturnValue(throwError(() => new Error('nope')));
    const failed = TestBed.runInInjectionContext(() => adminGuard({} as never, {} as never));
    const tree = await firstValueFrom(failed as any);

    expect(router.serializeUrl(tree)).toBe('/');
  });
});
