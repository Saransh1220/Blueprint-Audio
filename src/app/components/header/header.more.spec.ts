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
  const render = () => fixture.detectChanges();

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
    const userWrap = el().querySelector('.user-menu-wrap') as HTMLElement;
    component.onDocumentClick({ target: userWrap } as any);
    expect(component.isUserMenuOpen).toBe(true);
    document.body.click();
    render();
    expect(component.isUserMenuOpen).toBe(false);
  });

  it('builds notification items from live notifications', () => {
    const now = Date.now();
    notifications.set([
      { id: 'a', type: 'processing_failed', title: 'Failed', message: 'boom', is_read: false, created_at: new Date(now - 30_000) },
      { id: 'b', type: 'success', title: '', message: 'ok', is_read: true, created_at: new Date(now - 5 * 60_000) },
      { id: 'c', type: 'processing_complete', title: 'Done', message: 'x', is_read: false, created_at: new Date(now - 3 * 3600_000) },
      { id: 'd', type: 'error', title: 'Err', message: 'x', is_read: false, created_at: new Date(now - 50 * 3600_000) },
      { id: 'e', type: 'info', title: 'Info', message: 'x', is_read: false, created_at: new Date(now + 100000) },
      { id: 'f', type: 'info', title: 'Bad', message: 'x', is_read: false, created_at: 'not a date' },
    ]);
    const items = component.notificationItems();
    const byId = (id: string) => items.find((i) => i.id === id)!;
    expect(byId('a')).toMatchObject({ kind: 'system', avatar: '!', avatarClass: 'c-hot', time: 'now', unread: true, live: true });
    expect(byId('b')).toMatchObject({ kind: 'system', avatar: 'ok', avatarClass: 'c-lime', text: 'Notification', time: '5m', unread: false });
    expect(byId('c')).toMatchObject({ time: '3h' });
    expect(byId('d')).toMatchObject({ kind: 'system', avatar: '!', time: '2d' });
    expect(byId('e')).toMatchObject({ kind: 'message', avatar: 'i', avatarClass: 'c-cobalt', time: 'now' });
    expect(byId('f').time).toBe('now');
    expect(items.length).toBe(6 + 7);
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
    expect(component.visibleNotificationItems().map((i) => i.kind)).toEqual(['sale', 'sale']);
    component.setNotificationFilter('follow');
    expect(component.visibleNotificationItems().length).toBe(1);
    component.setNotificationFilter('milestone');
    component.setNotificationFilter('system');
    expect(component.visibleNotificationItems()).toEqual([]);

    const counts = component.notificationFilterCounts();
    expect(counts.all).toBe(all);
    expect(counts.sale).toBe(2);
    expect(counts.message).toBe(2);
    expect(counts.unread).toBe(3);
  });

  it('marks reference items read locally only and live items via service', () => {
    const ev = { stopPropagation: vi.fn() } as any;
    notifications.set([
      { id: 'l1', type: 'info', title: 'T', message: 'm', is_read: false, created_at: new Date() },
    ]);
    const before = component.notificationFilterCounts().unread;
    component.markAsRead('ref-sale-copper-saints', ev);
    expect(notif.markAsRead).not.toHaveBeenCalled();
    expect(component.notificationFilterCounts().unread).toBe(before - 1);
    component.markAsRead('l1', ev);
    expect(notif.markAsRead).toHaveBeenCalledWith('l1');
    component.markAllAsRead();
    expect(notif.markAllAsRead).toHaveBeenCalled();
    expect(component.notificationFilterCounts().unread).toBe(0);
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
    currentUser.set({ id: 'u', name: 'bob', role: Role.PRODUCER, avatar_url: 'a.png', display_name: 'Bobby' });
    isSuperAdmin.set(true);
    render();
    expect(el().querySelector('.upload-btn-cta')).toBeTruthy();
    expect(el().querySelector('.notification-badge')?.textContent).toContain('2');
    expect(el().textContent).toContain('Creator Tools');
    expect(el().textContent).toContain('Pro · @bob');

    // studio menu dismiss / reset
    const link = el().querySelector('.studio-nav-wrap a.sm-item') as HTMLElement;
    link.click();
    render();
    expect(component.isStudioMenuDismissed).toBe(true);
    expect(el().querySelector('.studio-nav-wrap')!.classList.contains('studio-menu-dismissed')).toBe(true);
    el().querySelector('.studio-nav-wrap')!.dispatchEvent(new Event('mouseenter'));
    expect(component.isStudioMenuDismissed).toBe(false);

    // notifications panel
    (el().querySelector('.notification-btn') as HTMLElement).click();
    render();
    expect(el().querySelector('.notifications-menu')).toBeTruthy();
    expect(el().querySelectorAll('.notif-item').length).toBe(7);
    expect(el().querySelector('.ni-mini-art')).toBeTruthy();
    const filters = el().querySelectorAll('.notif-filter');
    (filters[1] as HTMLElement).click();
    render();
    expect(component.notificationFilter()).toBe('unread');
    expect(el().querySelectorAll('.notif-item').length).toBe(2);
    (el().querySelector('.notif-item') as HTMLElement).click();
    render();
    expect(el().querySelectorAll('.notif-item').length).toBe(1);
    (el().querySelector('.notif-mark-read') as HTMLElement).click();
    render();
    expect(el().querySelector('.notif-empty')).toBeTruthy();
    expect(el().querySelector('.notif-pill')?.textContent).toContain('all caught up');
    (el().querySelector('.notif-foot a') as HTMLElement).click();
    expect(component.isNotificationsOpen).toBe(false);

    // user menu
    (el().querySelector('.user-btn') as HTMLElement).click();
    render();
    const menu = el().querySelector('.user-menu-neo') as HTMLElement;
    expect(menu.textContent).toContain('Bobby');
    expect(menu.textContent).toContain('PRODUCER');
    expect(menu.textContent).toContain('Upload Beat');
    expect(menu.textContent).toContain('Admin Console');
    (menu.querySelector('.notif-foot > button') as HTMLElement).click();
    expect(auth.logout).toHaveBeenCalled();
    expect(component.isUserMenuOpen).toBe(false);
  });

  it('renders listener UI with fallback avatar and listener badge', () => {
    currentUser.set({ id: 'u', name: 'zed', role: Role.ARTIST });
    render();
    expect(el().querySelector('.upload-btn-cta')).toBeNull();
    expect(el().querySelector('.user-avatar-fallback')?.textContent?.trim()).toBe('z');
    (el().querySelector('.user-btn') as HTMLElement).click();
    render();
    const menu = el().querySelector('.user-menu-neo') as HTMLElement;
    expect(menu.textContent).toContain('LISTENER');
    expect(menu.textContent).toContain('zed');
    expect(menu.textContent).not.toContain('Upload Beat');

    currentUser.set({ id: 'u', role: Role.ARTIST });
    render();
    expect(el().querySelector('.user-avatar-fallback')?.textContent?.trim()).toBe('U');
    expect(el().querySelector('.user-name')?.textContent?.trim()).toBe('User');

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
    expect(el().querySelector('.user-menu-wrap')).toBeNull();
    expect(el().querySelector('.hamburger-btn')).toBeNull();
    toggle.click();
    expect(shell.toggleMobileNav).toHaveBeenCalled();
  });

  it('toggles the mobile menu from the hamburger', () => {
    (el().querySelector('.hamburger-btn') as HTMLElement).click();
    render();
    expect(el().querySelector('.mobile-menu')!.classList.contains('open')).toBe(true);
    (el().querySelector('.mobile-logo-large a') as HTMLElement).click();
    expect(component.isMobileMenuOpen).toBe(false);
  });
});
