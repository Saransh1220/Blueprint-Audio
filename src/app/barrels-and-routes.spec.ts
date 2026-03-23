import { routes } from './app.routes';
import * as components from './components';
import * as pages from './pages';
import * as models from './models';
import './core/api/api-request';

describe('Barrels and Routes', () => {
  it('exports route table with expected paths', () => {
    const paths = routes.map((r) => r.path);
    expect(paths).toContain('');
    expect(paths).toContain('search');
    expect(paths).toContain('studio');
    expect(paths).toContain('dashboard');
    expect(paths).toContain('upload');
    expect(paths).toContain('analytics');
    expect(paths).toContain('**');
  });

  it('resolves lazy route components', async () => {
    const analyticsRoute = routes.find((r) => r.path === 'analytics');
    const ordersRoute = routes.find((r) => r.path === 'orders');
    const studioRoute = routes.find((r) => r.path === 'studio');
    const studioChildren = studioRoute?.children ?? [];
    const overviewChild = studioChildren.find((r) => r.path === 'overview');
    const tracksChild = studioChildren.find((r) => r.path === 'tracks');
    const studioAnalyticsChild = studioChildren.find((r) => r.path === 'analytics');
    const studioOrdersChild = studioChildren.find((r) => r.path === 'orders');
    const studioUploadChild = studioChildren.find((r) => r.path === 'upload');
    const studioProfileChild = studioChildren.find((r) => r.path === 'profile');

    expect(analyticsRoute).toBeDefined();
    expect(ordersRoute).toBeDefined();
    expect(studioRoute).toBeDefined();
    expect(studioRoute?.component).toBeDefined();
    expect((studioRoute?.component as any)?.name).toContain('StudioComponent');
    expect(studioChildren.map((r) => r.path)).toEqual([
      '',
      'overview',
      'tracks',
      'analytics',
      'orders',
      'upload',
      'profile',
    ]);
    expect(analyticsRoute?.loadComponent).toBeTypeOf('function');
    expect(ordersRoute?.loadComponent).toBeTypeOf('function');
    expect(overviewChild?.loadComponent).toBeTypeOf('function');
    expect(tracksChild?.loadComponent).toBeTypeOf('function');
    expect(studioAnalyticsChild?.loadComponent).toBeTypeOf('function');
    expect(studioOrdersChild?.loadComponent).toBeTypeOf('function');
    expect(studioUploadChild?.loadComponent).toBeTypeOf('function');
    expect(studioProfileChild?.loadComponent).toBeTypeOf('function');

    const [
      analyticsComponent,
      ordersComponent,
      overviewComponent,
      tracksComponent,
      studioAnalyticsComponent,
      studioOrdersComponent,
      studioUploadComponent,
      studioProfileComponent,
    ] = await Promise.all([
      analyticsRoute?.loadComponent?.(),
      ordersRoute?.loadComponent?.(),
      overviewChild?.loadComponent?.(),
      tracksChild?.loadComponent?.(),
      studioAnalyticsChild?.loadComponent?.(),
      studioOrdersChild?.loadComponent?.(),
      studioUploadChild?.loadComponent?.(),
      studioProfileChild?.loadComponent?.(),
    ]);

    expect(analyticsComponent).toBeTruthy();
    expect(ordersComponent).toBeTruthy();
    expect(overviewComponent).toBeTruthy();
    expect(tracksComponent).toBeTruthy();
    expect(studioAnalyticsComponent).toBeTruthy();
    expect(studioOrdersComponent).toBeTruthy();
    expect(studioUploadComponent).toBeTruthy();
    expect(studioProfileComponent).toBeTruthy();
  }, 10000);

  it('exports component, page and model barrels', () => {
    expect(components).toBeTruthy();
    expect(pages).toBeTruthy();
    expect(models).toBeTruthy();

    expect(models.Role.PRODUCER).toBe('producer');
    expect(models.Genre.TRAP).toBe('TRAP');
  });
});
