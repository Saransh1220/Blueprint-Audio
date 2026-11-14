import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Role, SystemRole, User } from '../models';
import { AuthService } from '../services/auth.service';
import { SessionStateService } from '../core/services/session-state.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const mockUser: User = {
    id: 'user-1',
    name: 'Test',
    display_name: 'Tester',
    email: 'test@example.com',
    role: Role.PRODUCER,
    system_role: SystemRole.USER,
    status: 'active',
    email_verified: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  let sessionState: SessionStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { sessionReady: Promise.resolve(null) } },
        SessionStateService,
      ],
    });
    sessionState = TestBed.inject(SessionStateService);
  });

  it('allows activation when session is verified', async () => {
    sessionState.setVerified(mockUser);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result).toBe(true);
  });

  it('redirects to login when session is anonymous', async () => {
    sessionState.setAnonymous();
    const router = TestBed.inject(Router);

    const result = await TestBed.runInInjectionContext(() => authGuard({} as never, {} as never));

    expect(result instanceof UrlTree).toBe(true);
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  });
});
