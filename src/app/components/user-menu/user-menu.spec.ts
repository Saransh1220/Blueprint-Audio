import '../../../test-setup';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { Role } from '../../models';
import { AuthService, AuthzService } from '../../services';
import { UserMenuComponent } from './user-menu';

describe('UserMenuComponent', () => {
  let fixture: ComponentFixture<UserMenuComponent>;
  let component: UserMenuComponent;
  let el: HTMLElement;
  const currentUser = signal<Record<string, unknown> | null>(null);
  const isSuperAdmin = signal(false);
  const logout = vi.fn();

  const trigger = () => el.querySelector('.trigger') as HTMLButtonElement;
  const panel = () => el.querySelector('.panel') as HTMLElement | null;
  const open = () => {
    trigger().click();
    fixture.detectChanges();
  };
  const labels = () => Array.from(el.querySelectorAll('.row')).map((a) => a.textContent?.trim());

  beforeEach(() => {
    vi.clearAllMocks();
    currentUser.set({ id: 'u1', name: 'nova', role: Role.PRODUCER, display_name: 'Nova Beats' });
    isSuperAdmin.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { currentUser, logout } },
        { provide: AuthzService, useValue: { isSuperAdmin } },
      ],
    });
    fixture = TestBed.createComponent(UserMenuComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  it('shows the initial in the button when there is no picture', () => {
    expect(el.querySelector('.trigger .avatar')?.textContent?.trim()).toBe('n');
  });

  it('shows the picture when there is one', () => {
    currentUser.update((u) => ({ ...u, avatar_url: '/me.png' }));
    fixture.detectChanges();
    const avatar = el.querySelector('.trigger .avatar') as HTMLElement;
    expect(avatar.style.backgroundImage).toContain('/me.png');
    expect(avatar.textContent?.trim()).toBe('');
  });

  it('falls back to "U" for a user with no name', () => {
    currentUser.set({ id: 'u2', role: Role.ARTIST });
    fixture.detectChanges();
    expect(el.querySelector('.trigger .avatar')?.textContent?.trim()).toBe('U');
  });

  it('opens from the button, with the state on the button', () => {
    expect(panel()).toBeNull();
    expect(trigger().getAttribute('aria-expanded')).toBe('false');
    open();
    expect(panel()).toBeTruthy();
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
    expect(trigger().classList.contains('active')).toBe(true);
    open();
    expect(panel()).toBeNull();
  });

  it('can be opened from outside through the model', () => {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    expect(panel()).toBeTruthy();
  });

  it('tells its owner when it opens or closes itself', () => {
    const changes: boolean[] = [];
    component.open.subscribe((value) => changes.push(value));
    open();
    open();
    expect(changes).toEqual([true, false]);
  });

  it('says who you are', () => {
    open();
    expect(el.querySelector('.name')?.textContent).toBe('Nova Beats');
    expect(el.querySelector('.handle')?.textContent).toBe('@nova');
    expect(el.querySelector('.role')?.textContent?.trim()).toBe('Producer');
  });

  it('falls back to the account name, then to "User"', () => {
    currentUser.set({ id: 'u', name: 'zed', role: Role.ARTIST });
    open();
    expect(el.querySelector('.name')?.textContent).toBe('zed');
    expect(el.querySelector('.role')?.textContent?.trim()).toBe('Listener');

    currentUser.set({ id: 'u', role: Role.ARTIST });
    fixture.detectChanges();
    expect(el.querySelector('.name')?.textContent).toBe('User');
  });

  it('gives a producer the studio and upload links', () => {
    open();
    expect(labels()).toEqual([
      'Studio overview',
      'Upload a beat',
      'Public profile',
      'My purchases',
      'Settings',
    ]);
  });

  it('gives a listener just their own pages', () => {
    currentUser.set({ id: 'u', name: 'zed', role: Role.ARTIST });
    open();
    expect(labels()).toEqual(['My purchases', 'Settings']);
  });

  it('adds the admin console for a super admin', () => {
    isSuperAdmin.set(true);
    open();
    expect(labels()).toContain('Admin console');
  });

  it('closes when a link is chosen', () => {
    open();
    (el.querySelector('.row') as HTMLAnchorElement).click();
    fixture.detectChanges();
    expect(panel()).toBeNull();
  });

  it('logs out and closes', () => {
    open();
    (el.querySelector('.logout') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(logout).toHaveBeenCalledTimes(1);
    expect(panel()).toBeNull();
  });

  describe('closing it', () => {
    beforeEach(() => open());

    it('closes on Escape and returns focus to the button', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      fixture.detectChanges();
      expect(panel()).toBeNull();
      expect(document.activeElement).toBe(trigger());
    });

    it('ignores other keys', () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
      expect(component.open()).toBe(true);
    });

    it('closes on a press outside, not inside', () => {
      panel()?.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(component.open()).toBe(true);
      document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      expect(component.open()).toBe(false);
    });

    it('stops listening to the document once closed', () => {
      const remove = vi.spyOn(document, 'removeEventListener');
      open();
      expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
      expect(remove).toHaveBeenCalledWith('pointerdown', expect.any(Function));
      remove.mockRestore();
    });
  });

  it('only listens to the document while open', () => {
    const add = vi.spyOn(document, 'addEventListener');
    const other = TestBed.createComponent(UserMenuComponent);
    other.detectChanges();
    expect(add).not.toHaveBeenCalledWith('keydown', expect.any(Function));
    add.mockRestore();
  });
});
