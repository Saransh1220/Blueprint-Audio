import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../services/theme.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  it('keeps the active settings tab and exposes theme service', () => {
    const currentMode = signal<'light' | 'dark'>('dark');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ThemeService,
          useValue: {
            currentMode,
          },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SettingsComponent());
    expect(component.themeService.currentMode()).toBe('dark');
    component.activeTab = 'account';
    expect(component.activeTab).toBe('account');
  });
});
