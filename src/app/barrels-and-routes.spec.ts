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
    expect(paths).toContain('dashboard');
    expect(paths).toContain('upload');
    expect(paths).toContain('analytics');
    expect(paths).toContain('**');
  });

  it('resolves lazy route components', async () => {
    const analyticsRoute = routes.find((r) => r.path === 'analytics');
    const ordersRoute = routes.find((r) => r.path === 'orders');

    expect(analyticsRoute).toBeDefined();
    expect(ordersRoute).toBeDefined();
    expect(analyticsRoute?.loadComponent).toBeTypeOf('function');
    expect(ordersRoute?.loadComponent).toBeTypeOf('function');

    const [analyticsComponent, ordersComponent] = await Promise.all([
      analyticsRoute?.loadComponent?.(),
      ordersRoute?.loadComponent?.(),
    ]);

    expect(analyticsComponent).toBeTruthy();
    expect(ordersComponent).toBeTruthy();
  }, 10000);

  it('exports component, page and model barrels', () => {
    expect(components).toBeTruthy();
    expect(pages).toBeTruthy();
    expect(models).toBeTruthy();

    expect(models.Role.PRODUCER).toBe('producer');
    expect(models.Genre.TRAP).toBe('TRAP');
  });
});
