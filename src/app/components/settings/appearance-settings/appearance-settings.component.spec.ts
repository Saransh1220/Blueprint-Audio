import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../../services/theme.service';
import { ToastService } from '../../../services/toast.service';
import { AppearanceSettingsComponent } from './appearance-settings.component';

describe('AppearanceSettingsComponent', () => {
  const setMode = vi.fn();
  const show = vi.fn();

  it('reads and applies light or dark mode', () => {
    const currentMode = signal<'light' | 'dark'>('dark');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ThemeService,
          useValue: {
            currentMode,
            setMode,
          },
        },
        { provide: ToastService, useValue: { show } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new AppearanceSettingsComponent());
    expect(component.currentMode).toBe('dark');

    component.setMode('light');
    expect(setMode).toHaveBeenCalledWith('light');
    expect(show).toHaveBeenCalledWith('Switched to light mode', 'success');
  });
});
