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
    expect(paths).toContain('verify-email');
    expect(paths).toContain('forgot-password');
    expect(paths).toContain('reset-password');
    expect(paths).toContain('upload');
    expect(paths).toContain('**');
  });

  it('resolves lazy route components', async () => {
    const studioRoute = routes.find((r) => r.path === 'studio');
    const studioChildren = studioRoute?.children ?? [];
    const overviewChild = studioChildren.find((r) => r.path === 'overview');
    const tracksChild = studioChildren.find((r) => r.path === 'tracks');
    const studioAnalyticsChild = studioChildren.find((r) => r.path === 'analytics');
    const studioOrdersChild = studioChildren.find((r) => r.path === 'orders');
    const studioPurchasesChild = studioChildren.find((r) => r.path === 'purchases');
    const studioUploadChild = studioChildren.find((r) => r.path === 'upload');
    const studioProfileChild = studioChildren.find((r) => r.path === 'profile');

    expect(studioRoute).toBeDefined();
    expect(studioRoute?.component).toBeDefined();
    expect((studioRoute?.component as any)?.name).toContain('StudioComponent');
    expect(studioChildren.map((r) => r.path)).toEqual([
      '',
      'overview',
      'tracks',
      'analytics',
      'orders',
      'purchases',
      'upload',
      'profile',
      'earnings',
      'messages',
      'settings-studio',
    ]);
    expect(overviewChild?.loadComponent).toBeTypeOf('function');
    expect(tracksChild?.loadComponent).toBeTypeOf('function');
    expect(studioAnalyticsChild?.loadComponent).toBeTypeOf('function');
    expect(studioOrdersChild?.loadComponent).toBeTypeOf('function');
    expect(studioPurchasesChild?.loadComponent).toBeTypeOf('function');
    expect(studioUploadChild?.loadComponent).toBeTypeOf('function');
    expect(studioProfileChild?.loadComponent).toBeTypeOf('function');

    const [
      overviewComponent,
      tracksComponent,
      studioAnalyticsComponent,
      studioOrdersComponent,
      studioPurchasesComponent,
      studioUploadComponent,
      studioProfileComponent,
    ] = await Promise.all([
      overviewChild?.loadComponent?.(),
      tracksChild?.loadComponent?.(),
      studioAnalyticsChild?.loadComponent?.(),
      studioOrdersChild?.loadComponent?.(),
      studioPurchasesChild?.loadComponent?.(),
      studioUploadChild?.loadComponent?.(),
      studioProfileChild?.loadComponent?.(),
    ]);

    expect(overviewComponent).toBeTruthy();
    expect(tracksComponent).toBeTruthy();
    expect(studioAnalyticsComponent).toBeTruthy();
    expect(studioOrdersComponent).toBeTruthy();
    expect(studioPurchasesComponent).toBeTruthy();
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
