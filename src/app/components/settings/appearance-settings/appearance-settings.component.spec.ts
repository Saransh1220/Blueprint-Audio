import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../services/theme.service';
import { ToastService } from '../../../services/toast.service';
import { AppearanceSettingsComponent } from './appearance-settings.component';

describe('AppearanceSettingsComponent', () => {
  const setTheme = vi.fn();
  const show = vi.fn();

  it('updates preview, computes gradients, and applies theme', () => {
    const activeTheme = signal('vampire');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ThemeService,
          useValue: {
            activeTheme,
            setTheme,
            themes: [
              { id: 'vampire', colors: ['#111', '#222'] },
              { id: 'neon', colors: ['#333', '#444'] },
            ],
          },
        },
        { provide: ToastService, useValue: { show } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AppearanceSettingsComponent());
    expect(component.previewTheme()).toBe('vampire');
    component.selectPreview('neon');
    expect(component.previewTheme()).toBe('neon');
    expect(component.getHeroGradient()).toContain('linear-gradient');
    component.selectPreview('unknown');
    expect(component.getHeroGradient()).toBe('black');

    component.applyTheme();
    expect(setTheme).toHaveBeenCalledWith('unknown');
    expect(show).toHaveBeenCalledWith('Theme applied successfully', 'success');
  });
});
