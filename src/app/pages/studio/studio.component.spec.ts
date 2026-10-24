import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthService } from '../../services';
import { StudioComponent } from './studio.component';

describe('StudioComponent', () => {
  const currentUser = signal<any>(null);

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser } },
        { provide: Router, useValue: {} },
      ],
    });
    currentUser.set(null);
  });

  function create() {
    return TestBed.runInInjectionContext(() => new StudioComponent());
  }

  it('derives producer display information from the authenticated user', () => {
    currentUser.set({
      id: 'u1',
      name: 'Legal Name',
      display_name: 'Stage Name',
      avatar_url: 'avatar.png',
    });

    const component = create();

    expect(component.displayName()).toBe('Stage Name');
    expect(component.avatarUrl()).toBe('avatar.png');
    expect(component.navItems.map((item) => item.path)).toEqual([
      'overview',
      'tracks',
      'analytics',
      'orders',
      'purchases',
      'tools',
      'profile',
    ]);
  });

  it('falls back to name and default producer label when profile data is missing', () => {
    currentUser.set({ id: 'u2', name: 'Fallback Name', display_name: '', avatar_url: null });
    const component = create();
    expect(component.displayName()).toBe('Fallback Name');
    expect(component.avatarUrl()).toBeNull();

    currentUser.set(null);
    expect(component.displayName()).toBe('Producer');
  });

  it('computes greeting by time of day and toggles mobile nav state', () => {
    const hourSpy = vi.spyOn(Date.prototype, 'getHours');

    hourSpy.mockReturnValueOnce(9);
    expect(create().greeting()).toBe('Good morning');

    hourSpy.mockReturnValueOnce(14);
    expect(create().greeting()).toBe('Good afternoon');

    hourSpy.mockReturnValueOnce(19);
    const component = create();
    expect(component.greeting()).toBe('Good evening');

    expect(component.isMobileNavOpen()).toBe(false);
    component.toggleMobileNav();
    expect(component.isMobileNavOpen()).toBe(true);
    component.closeMobileNav();
    expect(component.isMobileNavOpen()).toBe(false);

    hourSpy.mockRestore();
  });
  it('derives name parts, handle, stats and date', () => {
    currentUser.set({ id: 'u1', name: 'Legal Name', display_name: 'Stage Name Two' });
    const component = create();
    expect(component.firstName()).toBe('Stage');
    expect(component.lastName()).toBe('Name Two');
    expect(component.handle()).toBe('legal.name');
    expect(component.sidebarStats()).toEqual({ beats: 24, followers: 847 });
    expect(component.todayDate()).toMatch(/\w+, \w+ \d+/);

    currentUser.set(null);
    expect(component.firstName()).toBe('Producer');
    expect(component.lastName()).toBe('');
    expect(component.handle()).toBe('producer');

    currentUser.set({ id: 'u3', display_name: ' x' });
    expect(component.firstName()).toBe('Producer');
  });

  it('closes the mobile nav and logs out', () => {
    const logout = vi.fn();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser, logout } },
        { provide: Router, useValue: {} },
      ],
    });
    const component = create();
    component.toggleMobileNav();
    expect(component.isMobileNavOpen()).toBe(true);
    component.logout();
    expect(component.isMobileNavOpen()).toBe(false);
    expect(logout).toHaveBeenCalled();
  });
});
