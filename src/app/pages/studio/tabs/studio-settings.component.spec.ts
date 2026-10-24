import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService, ToastService } from '../../../services';
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

  describe('preferences', () => {
    const updateProfile = vi.fn();
    const success = vi.fn();
    const error = vi.fn();

    function setup(user: any = { name: 'A', store_currency: 'INR' }) {
      vi.clearAllMocks();
      TestBed.configureTestingModule({
        providers: [
          { provide: AuthService, useValue: { currentUser: signal(user), updateProfile } },
          { provide: ToastService, useValue: { success, error } },
        ],
      });
      return TestBed.runInInjectionContext(() => new StudioSettingsComponent());
    }

    it('defaults saved currency and selects currency', () => {
      const component = setup({ name: 'A' });
      expect(component.savedCurrency()).toBe('USD');
      component.selectCurrency('INR');
      expect(component.selectedCurrency()).toBe('INR');
    });

    it('saves preferences successfully', () => {
      updateProfile.mockReturnValue(of({}));
      const component = setup();
      expect(component.selectedCurrency()).toBe('INR');
      component.savePreferences();
      expect(updateProfile).toHaveBeenCalledWith({ store_currency: 'INR' });
      expect(success).toHaveBeenCalled();
      expect(component.isSaving()).toBe(false);
    });

    it('reports errors with message and fallback', () => {
      const component = setup();
      updateProfile.mockReturnValueOnce(throwError(() => new Error('boom')));
      component.savePreferences();
      expect(error).toHaveBeenCalledWith('boom');
      updateProfile.mockReturnValueOnce(throwError(() => null));
      component.savePreferences();
      expect(error).toHaveBeenCalledWith('Failed to update store preferences.');
    });

    it('ignores save while already saving', () => {
      const component = setup();
      component.isSaving.set(true);
      component.savePreferences();
      expect(updateProfile).not.toHaveBeenCalled();
    });

    it('renders the template and handles currency clicks', () => {
      updateProfile.mockReturnValue(of({}));
      const component = setup({ name: 'A', display_name: 'Ab', store_currency: 'INR' });
      const fixture = TestBed.createComponent(StudioSettingsComponent);
      fixture.detectChanges();
      const el: HTMLElement = fixture.nativeElement;
      const q = (sel: string) => el.querySelector(sel) as HTMLButtonElement;
      expect(q('.save-btn').disabled).toBe(true);
      const options = Array.from(el.querySelectorAll('.currency-btn')) as HTMLButtonElement[];
      expect(options.length).toBe(2);
      options[0].click();
      fixture.detectChanges();
      expect(q('.save-btn').disabled).toBe(false);
      q('.save-btn').click();
      fixture.detectChanges();
      expect(updateProfile).toHaveBeenCalledWith({ store_currency: 'USD' });
      expect(component).toBeTruthy();
    });
  });
});
