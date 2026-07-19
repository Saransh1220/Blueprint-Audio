import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { routes } from './app.routes';
import { Role } from './models';
import { AuthService } from './services';

describe('application route callbacks', () => {
  const authServiceMock = { currentUser: vi.fn() };
  const routerMock = { parseUrl: vi.fn().mockReturnValue({ redirect: '/studio/purchases' }) };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  afterEach(() => vi.clearAllMocks());

  it('resolves every remaining lazy route component', async () => {
    const studio = routes.find((route) => route.path === 'studio');
    const children = studio?.children ?? [];
    const lazyRoutes = [
      routes.find((route) => route.path === '@/:handle'),
      routes.find((route) => route.path === 'beats/:id'),
      children.find((route) => route.path === 'earnings'),
      children.find((route) => route.path === 'messages'),
      children.find((route) => route.path === 'settings-studio'),
      routes.find((route) => route.path === 'admin'),
      routes.find((route) => route.path === ':shortCode'),
    ];

    const components = await Promise.all(lazyRoutes.map((route) => route?.loadComponent?.()));
    expect(components).toHaveLength(7);
    for (const component of components) expect(component).toBeTruthy();
  }, 10_000);

  it('redirects the studio landing page according to role', () => {
    const landing = routes
      .find((route) => route.path === 'studio')
      ?.children?.find((route) => route.path === '');
    const redirect = landing?.redirectTo as () => string;

    authServiceMock.currentUser.mockReturnValue({ role: Role.PRODUCER });
    expect(TestBed.runInInjectionContext(() => redirect())).toBe('overview');

    authServiceMock.currentUser.mockReturnValue({ role: Role.ARTIST });
    expect(TestBed.runInInjectionContext(() => redirect())).toBe('purchases');
  });

  it('allows producer tools and redirects non-producers', () => {
    const tools = routes
      .find((route) => route.path === 'studio')
      ?.children?.find((route) => route.path === 'tools');
    const guard = tools?.canActivate?.[0] as () => unknown;

    authServiceMock.currentUser.mockReturnValue({ role: Role.PRODUCER });
    expect(TestBed.runInInjectionContext(() => guard())).toBe(true);

    authServiceMock.currentUser.mockReturnValue({ role: Role.ARTIST });
    expect(TestBed.runInInjectionContext(() => guard())).toEqual({
      redirect: '/studio/purchases',
    });
    expect(routerMock.parseUrl).toHaveBeenCalledWith('/studio/purchases');
  });
});
