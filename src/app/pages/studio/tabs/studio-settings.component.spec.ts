import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../services';
import { StudioSettingsComponent } from './studio-settings.component';

describe('StudioSettingsComponent', () => {
  it('derives profile display values from current user', () => {
    const currentUser = signal({ display_name: 'Blaze Pro', name: 'Blaze Producer' });
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser } }],
    });

    const component = TestBed.runInInjectionContext(() => new StudioSettingsComponent());

    expect(component.displayName()).toBe('Blaze Pro');
    expect(component.handle()).toBe('blaze.producer');
    expect(component.avatarLetter()).toBe('b');
    expect(component.location()).toBe('India');
    expect(component.notifications.filter((n) => n.on).length).toBe(3);
  });

  it('falls back when user names are missing', () => {
    const currentUser = signal(null);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { currentUser } }],
    });

    const component = TestBed.runInInjectionContext(() => new StudioSettingsComponent());

    expect(component.displayName()).toBe('Your Name');
    expect(component.handle()).toBe('handle');
    expect(component.avatarLetter()).toBe('y');
  });
});
