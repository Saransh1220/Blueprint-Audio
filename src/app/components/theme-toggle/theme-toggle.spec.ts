import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../services/theme.service';
import { ThemeToggleComponent } from './theme-toggle';

describe('ThemeToggleComponent', () => {
  it('toggles theme mode', () => {
    const toggleMode = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ThemeService, useValue: { toggleMode } }],
    });
    const component = TestBed.runInInjectionContext(() => new ThemeToggleComponent());

    component.toggleMode();
    expect(toggleMode).toHaveBeenCalledOnce();
  });
});
