import '../../../test-setup';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Role } from '../../models';
import { StudioShellService } from '../../pages/studio/studio-shell.service';
import { AuthService, AuthzService, CartService, NotificationService } from '../../services';
import { HeaderComponent } from './header';

describe('HeaderComponent (more)', () => {
  let fixture: ComponentFixture<HeaderComponent>;
  let component: HeaderComponent;
  let currentUser: ReturnType<typeof signal<any>>;
  let notifications: ReturnType<typeof signal<any[]>>;
  let isSuperAdmin: ReturnType<typeof signal<boolean>>;
  let count: ReturnType<typeof signal<number>>;
  let notif: any;
  let auth: any;
  let router: Router;
  let url: string;
  let shell: { toggleMobileNav: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    currentUser = signal<any>(null);
    notifications = signal<any[]>([]);
    isSuperAdmin = signal(false);
    count = signal(0);
    url = '/';
    shell = { toggleMobileNav: vi.fn() };
    auth = { currentUser, logout: vi.fn() };
    notif = {
      notifications,
      unreadCount: signal(0),
      markAsRead: vi.fn(),
      markAllAsRead: vi.fn(),
    };
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: AuthzService, useValue: { isSuperAdmin } },
        { provide: CartService, useValue: { count } },
        { provide: NotificationService, useValue: notif },
        { provide: StudioShellService, useValue: shell },
      ],
    });
    router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockImplementation(() => url);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(HeaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const el = () => fixture.nativeElement as HTMLElement;
  const render = () => {
    fixture.changeDetectorRef.markForCheck();
    fixture.detectChanges();
  };

  it('detects studio, browse and studio-section routes', () => {
    url = '/studio/overview';
    expect(component.isStudioRoute()).toBe(true);
    expect(component.isStudioSection('overview')).toBe(true);
    url = '/studio/overview/x';
    expect(component.isStudioSection('overview')).toBe(true);
    url = '/studio/tracks';
    expect(component.isStudioSection('overview')).toBe(false);
    url = '/home';
    expect(component.isStudioRoute()).toBe(false);

    for (const ok of [
      '/explore',
      '/explore?search=a',
      '/loops',
      '/battles',
      '/battles/12',
      '/sample-packs',
      '/sample-packs/x#hash',
    ]) {
      url = ok;
      expect(component.isBrowseRoute()).toBe(true);
    }
    url = '/cart';
    expect(component.isBrowseRoute()).toBe(false);
  });

  it('submits a global search with and without a query', () => {
    component.globalSearchTerm = '  trap  ';
    component.isMobileMenuOpen = true;
    component.isNotificationsOpen = true;
    component.isUserMenuOpen = true;
    component.submitGlobalSearch();
    expect(router.navigate).toHaveBeenCalledWith(['/explore'], { queryParams: { search: 'trap' } });
    expect(component.isMobileMenuOpen).toBe(false);
    expect(component.isNotificationsOpen).toBe(false);
    expect(component.isUserMenuOpen).toBe(false);

    component.globalSearchTerm = '   ';
    component.submitGlobalSearch();
    expect(router.navigate).toHaveBeenLastCalledWith(['/explore'], { queryParams: {} });
  });

  it('submits search via the form', () => {
    component.globalSearchTerm = 'lofi';
    const form = el().querySelector('form.nav-search') as HTMLFormElement;
    form.dispatchEvent(new Event('submit'));
    expect(router.navigate).toHaveBeenCalled();
  });

  it('toggles the studio mobile nav and closes other menus', () => {
    component.isMobileMenuOpen = true;
    component.isNotificationsOpen = true;
    component.isUserMenuOpen = true;
    component.toggleStudioMobileNav();
    expect(shell.toggleMobileNav).toHaveBeenCalled();
    expect(component.isMobileMenuOpen).toBe(false);
    expect(component.isNotificationsOpen).toBe(false);
    expect(component.isUserMenuOpen).toBe(false);
  });

  it('keeps menus open when clicking inside, closes when outside via document click', () => {
    currentUser.set({ id: 'u', name: 'bob', role: Role.PRODUCER });
    render();
    (el().querySelector('.notification-btn') as HTMLElement).click();
    render();
    const inside = el().querySelector('.notification-wrap') as HTMLElement;
    component.onDocumentClick({ target: inside } as any);
    expect(component.isNotificationsOpen).toBe(true);

    (el().querySelector('.user-btn') as HTMLElement).click();
    render();
    expect(component.isNotificationsOpen).toBe(false);
    expect(component.isUserMenuOpen).toBe(true);
    const menuPanel = el().querySelector('app-user-menu .panel') as HTMLElement;
    menuPanel.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    render();
    expect(component.isUserMenuOpen).toBe(true);
    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    render();
    expect(component.isUserMenuOpen).toBe(false);
  });

  it('builds notification items from live notifications', () => {
    const now = Date.now();
    notifications.set([
      {
        id: 'a',
        type: 'processing_failed',
        title: 'Failed',
        message: 'boom',
        is_read: false,
        created_at: new Date(now - 30_000),
      },
      {
        id: 'b',
        type: 'success',
        title: '',
        message: 'ok',
        is_read: true,
        created_at: new Date(now - 5 * 60_000),
      },
      {
        id: 'c',
        type: 'processing_complete',
        title: 'Done',
        message: 'x',
        is_read: false,
        created_at: new Date(now - 3 * 3600_000),
      },
      {
        id: 'd',
        type: 'error',
        title: 'Err',
        message: 'x',
        is_read: false,
        created_at: new Date(now - 50 * 3600_000),
      },
      {
        id: 'e',
        type: 'info',
        title: 'Info',
        message: 'x',
        is_read: false,
        created_at: new Date(now + 100000),
      },
      {
        id: 'f',
        type: 'info',
        title: 'Bad',
        message: 'x',
        is_read: false,
        created_at: 'not a date',
      },
    ]);
    const items = component.notificationItems();
    const byId = (id: string) => items.find((i) => i.id === id)!;
    expect(byId('a')).toMatchObject({
      kind: 'system',
      avatar: '!',
      avatarClass: 'c-hot',
      time: 'now',
      unread: true,
      live: true,
    });
    expect(byId('b')).toMatchObject({
      kind: 'system',
      avatar: 'ok',
      avatarClass: 'c-lime',
      text: 'Notification',
      time: '5m',
      unread: false,
    });
    expect(byId('c')).toMatchObject({ time: '3h' });
    expect(byId('d')).toMatchObject({ kind: 'system', avatar: '!', time: '2d' });
    expect(byId('e')).toMatchObject({
      kind: 'message',
      avatar: 'i',
      avatarClass: 'c-cobalt',
      time: 'now',
    });
    expect(byId('f').time).toBe('now');
    expect(items.length).toBe(6);
  });

  it('filters notifications and reports counts', () => {
    notifications.set([
      { id: 'l1', type: 'info', title: 'T', message: 'm', is_read: false, created_at: new Date() },
    ]);
    const all = component.notificationItems().length;
    expect(component.visibleNotificationItems().length).toBe(all);
    component.setNotificationFilter('unread');
    expect(component.visibleNotificationItems().every((i) => i.unread)).toBe(true);
    component.setNotificationFilter('sale');
    expect(component.visibleNotificationItems().map((i) => i.kind)).toEqual([]);
    component.setNotificationFilter('follow');
    expect(component.visibleNotificationItems().length).toBe(0);
    component.setNotificationFilter('milestone');
    component.setNotificationFilter('system');
    expect(component.visibleNotificationItems()).toEqual([]);

    const counts = component.notificationFilterCounts();
    expect(counts.all).toBe(all);
    expect(counts.sale).toBe(0);
    expect(counts.message).toBe(1);
    expect(counts.unread).toBe(0);
  });

  it('delegates read mutations to the API service without adding local reference rows', () => {
    const ev = { stopPropagation: vi.fn() } as any;
    notifications.set([
      { id: 'live-1', type: 'info', is_read: false, title: 'Real', created_at: new Date() },
    ]);
    component.markAsRead('live-1', ev);
    expect(notif.markAsRead).toHaveBeenCalledWith('live-1');
    component.markAllAsRead();
    expect(notif.markAllAsRead).toHaveBeenCalled();
    expect(component.notificationItems().map((item) => item.id)).toEqual(['live-1']);
  });

  it('renders logged-out state', () => {
    expect(el().querySelector('.login-btn')).toBeTruthy();
    expect(el().querySelector('.notification-wrap')).toBeNull();
    expect(el().textContent).not.toContain('Admin');
    // mobile menu login link
    expect(el().querySelector('.mobile-links a[href="/login"]')).toBeTruthy();
  });

  it('renders cart badge and admin links', () => {
    count.set(3);
    isSuperAdmin.set(true);
    render();
    expect(el().querySelector('.cart-badge')?.textContent).toContain('3');
    expect(el().textContent).toContain('Admin');
  });

  it('renders producer UI: studio menu, upload, notifications and user menu', () => {
    currentUser.set({
      id: 'u',
      name: 'bob',
      role: Role.PRODUCER,
      avatar_url: 'a.png',
      display_name: 'Bobby',
    });
    isSuperAdmin.set(true);
    render();
    expect(el().querySelector('.upload-btn-cta')).toBeTruthy();
    notif.unreadCount.set(2);
    render();
    expect(el().querySelector('.notification-badge')?.textContent).toContain('2');
    const trigger = el().querySelector<HTMLButtonElement>('.studio-nav-link')!;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    trigger.click();
    render();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const studio = el().querySelector('#header-studio-panel')!;
    expect(studio.querySelector('a[href="/studio/overview"]')).toBeTruthy();
    (studio.querySelector('a.item') as HTMLElement).click();
    render();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(el().querySelector('#header-studio-panel')).toBeNull();

    // notifications panel
    (el().querySelector('.notification-btn') as HTMLElement).click();
    render();
    expect(el().querySelector('.notifications-menu')).toBeTruthy();
    expect(el().querySelectorAll('.notif-item').length).toBe(0);
    expect(el().querySelector('.notif-empty')).toBeTruthy();
    component.closeNotifications();
    render();

    // user menu
    (el().querySelector('.user-btn') as HTMLElement).click();
    render();
    const menu = el().querySelector('app-user-menu .panel') as HTMLElement;
    expect(menu.textContent).toContain('Bobby');
    expect(menu.textContent).toContain('Producer');
    expect(menu.textContent).toContain('Upload a beat');
    expect(menu.textContent).toContain('Admin console');
    (menu.querySelector('.foot .logout') as HTMLElement).click();
    expect(auth.logout).toHaveBeenCalled();
    expect(component.isUserMenuOpen).toBe(false);
  });

  it('opens desktop panels on pointer entry and leaves the account menu click-driven', () => {
    currentUser.set({ id: 'u', name: 'bob', role: Role.PRODUCER });
    render();
    const hover = (selector: string) => {
      const event = new Event('pointerenter');
      Object.defineProperty(event, 'pointerType', { value: 'mouse' });
      el().querySelector(selector)!.dispatchEvent(event);
      render();
    };

    hover('.browse-nav-wrap');
    expect(el().querySelector('#header-browse-panel')).toBeTruthy();
    hover('.studio-nav-wrap');
    expect(el().querySelector('#header-browse-panel')).toBeNull();
    expect(el().querySelector('#header-studio-panel')).toBeTruthy();
    hover('.notification-wrap');
    expect(el().querySelector('#header-studio-panel')).toBeNull();
    expect(el().querySelector('#header-notifications')).toBeTruthy();
    hover('.currency-switcher-wrap');
    expect(el().querySelector('#header-notifications')).toBeNull();
    expect(el().querySelector('#header-currency')).toBeTruthy();
    hover('.user-btn');
    expect(el().querySelector('#header-account')).toBeNull();
    (el().querySelector('.user-btn') as HTMLButtonElement).click();
    render();
    expect(el().querySelector('#header-account')).toBeTruthy();
    expect(el().querySelector('#header-currency')).toBeNull();
  });

  it('dismisses the Browse popup on Escape and restores focus to its trigger', () => {
    const trigger = el().querySelector<HTMLButtonElement>('.browse-nav-link')!;
    trigger.click();
    render();
    const link = el().querySelector<HTMLAnchorElement>('#header-browse-panel a')!;
    link.focus();

    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    link.dispatchEvent(escape);
    render();

    expect(escape.defaultPrevented).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(trigger);
  });

  it('closes a popup when Angular starts navigating', async () => {
    const trigger = el().querySelector<HTMLButtonElement>('.browse-nav-link')!;
    trigger.click();
    render();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');

    router.resetConfig([{ path: 'explore', component: HeaderComponent }]);
    await router.navigateByUrl('/explore');
    render();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders listener UI with fallback avatar and listener badge', () => {
    currentUser.set({ id: 'u', name: 'zed', role: Role.ARTIST });
    render();
    expect(el().querySelector('.upload-btn-cta')).toBeNull();
    expect(el().querySelector('app-user-menu .trigger .avatar')?.textContent?.trim()).toBe('z');
    (el().querySelector('.user-btn') as HTMLElement).click();
    render();
    const menu = el().querySelector('app-user-menu .panel') as HTMLElement;
    expect(menu.textContent).toContain('Listener');
    expect(menu.textContent).toContain('zed');
    expect(menu.textContent).not.toContain('Upload a beat');

    currentUser.set({ id: 'u', role: Role.ARTIST });
    render();
    expect(el().querySelector('app-user-menu .trigger .avatar')?.textContent?.trim()).toBe('U');
    expect(el().querySelector('app-user-menu .name')?.textContent?.trim()).toBe('User');

    // mobile logout
    (el().querySelector('.mobile-logout-btn') as HTMLElement).click();
    expect(auth.logout).toHaveBeenCalled();
  });

  it('renders the studio-route header', () => {
    url = '/studio/overview';
    currentUser.set({ id: 'u', name: 'bob', role: Role.PRODUCER });
    render();
    const toggle = el().querySelector('.studio-menu-toggle') as HTMLElement;
    expect(toggle).toBeTruthy();
    // The account menu is there in the studio too.
    expect(el().querySelector('app-user-menu .user-btn')).toBeTruthy();
    expect(el().querySelector('.hamburger-btn')).toBeTruthy();
    toggle.click();
    expect(shell.toggleMobileNav).toHaveBeenCalled();
  });

  it('toggles the mobile menu from the hamburger', () => {
    (el().querySelector('.hamburger-btn') as HTMLElement).click();
    render();
    expect(el().querySelector('.mobile-menu')!.classList.contains('open')).toBe(true);
    (el().querySelector('.mobile-links a[href="/"]') as HTMLElement).click();
    expect(component.isMobileMenuOpen).toBe(false);
  });
});
