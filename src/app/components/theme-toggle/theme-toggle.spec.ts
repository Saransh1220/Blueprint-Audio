import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../services/theme.service';
import { ThemeToggleComponent } from './theme-toggle';

describe('ThemeToggleComponent', () => {
  it('toggles dropdown and selects themes', () => {
    const setTheme = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: ThemeService, useValue: { setTheme } }],
    });
    const component = TestBed.runInInjectionContext(() => new ThemeToggleComponent());
    const event = { stopPropagation: vi.fn() } as any;

    component.toggleDropdown(event);
    expect(component.isDropdownOpen).toBe(true);

    component.selectTheme('neon', event);
    expect(setTheme).toHaveBeenCalledWith('neon');
    expect(component.isDropdownOpen).toBe(false);

    component.toggleDropdown(event);
    component.closeDropdown();
    expect(component.isDropdownOpen).toBe(false);
  });
});
