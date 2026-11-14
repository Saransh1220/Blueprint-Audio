import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  input,
  signal,
  ViewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { NavigationStart, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BRAND } from '../../core/config/brand';
import { Role } from '../../models';
import { StudioShellService } from '../../pages/studio/studio-shell.service';
import { AuthService, AuthzService, CartService, NotificationService } from '../../services';
import { CurrencySwitcherComponent } from '../currency-switcher/currency-switcher.component';
import { NavMenuComponent } from '../nav-menu/nav-menu';
import { BROWSE_ITEMS, menuItemsFor, STUDIO_ITEMS } from '../nav-menu/nav-menu.items';
import { UserMenuComponent } from '../user-menu/user-menu';

import { HoverPopupDirective, isKeyboardOrTouchActivation } from './hover-popup.directive';

type NavPanel = 'browse' | 'studio';
type HeaderPopup = NavPanel | 'account' | 'notifications' | 'currency' | 'mobile';

type NotificationKind =
  'all' | 'unread' | 'sale' | 'message' | 'cart' | 'follow' | 'milestone' | 'wishlist' | 'system';

interface HeaderNotificationItem {
  id: string;
  kind: Exclude<NotificationKind, 'all' | 'unread'>;
  unread: boolean;
  avatar: string;
  avatarClass: string;
  text: string;
  accent?: string;
  time: string;
  amount?: string;
  license?: string;
  artLetter?: string;
  artGradient?: string;
  live?: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    RouterLinkActive,
    NavMenuComponent,
    UserMenuComponent,
    CurrencySwitcherComponent,
    HoverPopupDirective,
  ],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
  readonly brand = BRAND;
  isMobileMenuOpen = false;
  cartService = inject(CartService);
  authService = inject(AuthService);
  authzService = inject(AuthzService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  studioShell = inject(StudioShellService);
  globalSearchTerm = '';
  /** On sidebar routes the logo and Browse/Studio links live in the sidebar. */
  readonly sidebarLayout = input(false);

  // Expose Role enum to template
  readonly Role = Role;

  // The Browse and Studio panels list what the signed-in person can reach.
  private readonly isProducer = computed(
    () => this.authService.currentUser()?.role === Role.PRODUCER,
  );
  readonly browseItems = computed(() => menuItemsFor(BROWSE_ITEMS, this.isProducer()));
  readonly studioItems = computed(() => menuItemsFor(STUDIO_ITEMS, this.isProducer()));

  // Notifications
  isNotificationsOpen = false;
  activeNavPanel: NavPanel | null = null;
  isCurrencyOpen = false;
  @ViewChild('browseTrigger') private browseTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('studioTrigger') private studioTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('notificationTrigger') private notificationTrigger?: ElementRef<HTMLButtonElement>;
  @ViewChild('mobileMenuToggle') private mobileMenuToggle?: ElementRef<HTMLButtonElement>;
  @ViewChild('notificationWrap') notificationWrap?: ElementRef<HTMLElement>;
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  notificationFilter = signal<NotificationKind>('all');
  notificationItems = computed(() => [
    ...this.notifications().map((n): HeaderNotificationItem => {
      const complete = n.type === 'processing_complete' || n.type === 'success';
      const failed = n.type === 'processing_failed' || n.type === 'error';
      return {
        id: n.id,
        kind: failed || complete ? 'system' : 'message',
        unread: !n.is_read,
        avatar: failed ? '!' : complete ? 'ok' : 'i',
        avatarClass: failed ? 'c-hot' : complete ? 'c-lime' : 'c-cobalt',
        text: n.title || 'Notification',
        accent: n.message,
        time: this.relativeNotificationTime(n.created_at),
        live: true,
      };
    }),
  ]);
  visibleNotificationItems = computed(() => {
    const filter = this.notificationFilter();
    const items = this.notificationItems();
    if (filter === 'all') return items;
    if (filter === 'unread') return items.filter((item) => item.unread);
    return items.filter((item) => item.kind === filter);
  });
  notificationFilterCounts = computed(() => {
    const items = this.notificationItems();
    return {
      all: items.length,
      unread: this.unreadCount(),
      sale: items.filter((item) => item.kind === 'sale').length,
      message: items.filter((item) => item.kind === 'message').length,
    };
  });

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) this.closePopups();
    });
  }

  isStudioRoute() {
    return this.router.url.startsWith('/studio');
  }

  isHomeRoute() {
    return this.router.url.split(/[?#]/, 1)[0] === '/';
  }

  readonly isScrolled = signal(false);
  private lastScrollY = 0;

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrollY = Math.max(0, window.scrollY);
    if (scrollY === this.lastScrollY) return;

    this.isScrolled.set(scrollY > 24 && scrollY > this.lastScrollY);
    this.lastScrollY = scrollY;
  }

  isBrowseRoute() {
    const path = this.router.url.split(/[?#]/, 1)[0];
    return (
      path === '/explore' ||
      path === '/discover' ||
      path === '/creator-tools' ||
      path === '/loops' ||
      path === '/battles' ||
      path.startsWith('/battles/') ||
      path === '/sample-packs' ||
      path.startsWith('/sample-packs/')
    );
  }

  isStudioSection(path: string) {
    return this.router.url === `/studio/${path}` || this.router.url.startsWith(`/studio/${path}/`);
  }

  submitGlobalSearch() {
    const query = this.globalSearchTerm.trim();
    this.router.navigate(['/explore'], {
      queryParams: query ? { search: query } : {},
    });
    this.closePopups();
  }

  @HostListener('document:pointerdown', ['$event'])
  @HostListener('document:focusin', ['$event'])
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target;
    if (!(target instanceof Element)) return;

    if (this.activeNavPanel && !target.closest(`[data-nav-panel="${this.activeNavPanel}"]`)) {
      this.closeNavPanel();
    }
    if (this.isNotificationsOpen && !this.notificationWrap?.nativeElement.contains(target)) {
      this.closeNotifications();
    }
    if (this.isMobileMenuOpen && !target.closest('#header-mobile-menu, .hamburger-btn')) {
      this.closeMobileMenu();
    }
  }

  @HostListener('document:keydown.escape', ['$event'])
  dismissPopup(event: Event) {
    if (event.defaultPrevented) return;
    if (this.activeNavPanel) {
      const trigger = this.activeNavPanel === 'browse' ? this.browseTrigger : this.studioTrigger;
      this.closeNavPanel();
      trigger?.nativeElement.focus();
    } else if (this.isNotificationsOpen) {
      this.closeNotifications();
      this.notificationTrigger?.nativeElement.focus();
    } else if (this.isMobileMenuOpen) {
      this.closeMobileMenu();
      this.mobileMenuToggle?.nativeElement.focus();
    } else {
      return;
    }
    event.preventDefault();
  }

  toggleNavPanel(panel: NavPanel, event?: MouseEvent) {
    if (!isKeyboardOrTouchActivation(event)) {
      this.setNavPanelOpen(panel, true);
      return;
    }
    this.setNavPanelOpen(panel, this.activeNavPanel !== panel);
  }

  setNavPanelOpen(panel: NavPanel, open: boolean) {
    if (!open) {
      if (this.activeNavPanel === panel) this.closeNavPanel();
      return;
    }
    this.closePopups(panel);
    this.activeNavPanel = panel;
  }

  closeNavPanel() {
    this.activeNavPanel = null;
  }

  toggleStudioMobileNav() {
    this.closePopups();
    this.studioShell.toggleMobileNav();
  }

  toggleNotifications(event?: MouseEvent) {
    if (!isKeyboardOrTouchActivation(event)) return;
    this.setNotificationsOpen(!this.isNotificationsOpen);
  }

  setNotificationsOpen(open: boolean) {
    this.isNotificationsOpen = open;
    if (open) this.closePopups('notifications');
  }

  closeNotifications() {
    this.isNotificationsOpen = false;
  }

  markAsRead(id: string, event: Event) {
    event.stopPropagation();
    this.notificationService.markAsRead(id);
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  setNotificationFilter(filter: NotificationKind) {
    this.notificationFilter.set(filter);
  }

  private relativeNotificationTime(value: Date | string) {
    const date = new Date(value);
    const diff = Date.now() - date.getTime();
    if (!Number.isFinite(diff) || diff < 0) return 'now';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  toggleMobileMenu(event?: MouseEvent) {
    if (!isKeyboardOrTouchActivation(event)) return;
    this.setMobileMenuOpen(!this.isMobileMenuOpen);
  }

  setMobileMenuOpen(open: boolean) {
    this.isMobileMenuOpen = open;
    if (open) this.closePopups('mobile');
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  isUserMenuOpen = false;

  toggleUserMenu() {
    this.setUserMenuOpen(!this.isUserMenuOpen);
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  setUserMenuOpen(open: boolean) {
    this.isUserMenuOpen = open;
    if (open) this.closePopups('account');
  }

  setCurrencyOpen(open: boolean) {
    this.isCurrencyOpen = open;
    if (open) this.closePopups('currency');
  }

  private closePopups(except?: HeaderPopup) {
    if (except !== 'browse' && except !== 'studio') this.closeNavPanel();
    if (except !== 'notifications') this.closeNotifications();
    if (except !== 'account') this.closeUserMenu();
    if (except !== 'mobile') this.closeMobileMenu();
    if (except !== 'currency') this.isCurrencyOpen = false;
  }
}
