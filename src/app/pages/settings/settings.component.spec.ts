import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from '../../services/theme.service';
import { SettingsComponent } from './settings.component';

describe('SettingsComponent', () => {
  it('resolves active theme details from theme service', () => {
    const activeTheme = signal('vampire');
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ThemeService,
          useValue: {
            activeTheme,
            themes: [
              { id: 'vampire', colors: ['#1', '#2'] },
              { id: 'neon', colors: ['#3', '#4'] },
            ],
          },
        },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SettingsComponent());
    expect(component.activeThemeDetails()?.id).toBe('vampire');
    component.activeTab = 'account';
    expect(component.activeTab).toBe('account');
  });
});
