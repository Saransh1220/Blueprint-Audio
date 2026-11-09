import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  HostListener,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { BRAND } from '../../core/config/brand';
import { Role } from '../../models';
import { StudioShellService } from '../../pages/studio/studio-shell.service';
import { AuthService, AuthzService, CartService, NotificationService } from '../../services';
import { CurrencySwitcherComponent } from '../currency-switcher/currency-switcher.component';
import { NavMenuComponent } from '../nav-menu/nav-menu';
import { BROWSE_ITEMS, menuItemsFor, STUDIO_ITEMS } from '../nav-menu/nav-menu.items';
import { UserMenuComponent } from '../user-menu/user-menu';

type NotificationKind =
  | 'all'
  | 'unread'
  | 'sale'
  | 'message'
  | 'cart'
  | 'follow'
  | 'milestone'
  | 'wishlist'
  | 'system';

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
  isStudioMenuDismissed = false;
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

  isStudioRoute() {
    return this.router.url.startsWith('/studio');
  }

  isHomeRoute() {
    return this.router.url.split(/[?#]/, 1)[0] === '/';
  }

  readonly isScrolled = signal(false);

  @HostListener('window:scroll')
  onWindowScroll() {
    const scrolled = window.scrollY > 24;
    if (scrolled !== this.isScrolled()) this.isScrolled.set(scrolled);
  }

  isBrowseRoute() {
    const path = this.router.url.split(/[?#]/, 1)[0];
    return (
      path === '/explore' ||
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
    this.closeMobileMenu();
    this.closeNotifications();
    this.closeUserMenu();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as Node;
    if (this.isNotificationsOpen && !this.notificationWrap?.nativeElement.contains(target)) {
      this.closeNotifications();
    }
  }

  resetStudioMenuDismissal() {
    this.isStudioMenuDismissed = false;
  }

  closeStudioMenu() {
    this.isStudioMenuDismissed = true;
  }

  toggleStudioMobileNav() {
    this.closeMobileMenu();
    this.closeNotifications();
    this.closeUserMenu();
    this.studioShell.toggleMobileNav();
  }

  toggleNotifications() {
    this.isNotificationsOpen = !this.isNotificationsOpen;
    if (this.isNotificationsOpen) {
      this.closeUserMenu();
      this.closeMobileMenu();
    }
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

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    if (this.isMobileMenuOpen) {
      this.closeUserMenu();
      this.closeNotifications();
    }
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  isUserMenuOpen = false;

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
    if (this.isUserMenuOpen) {
      this.closeNotifications();
      this.closeMobileMenu();
    }
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }

  /** The account menu opened or closed itself; opening it puts the other popups away. */
  setUserMenuOpen(open: boolean) {
    this.isUserMenuOpen = open;
    if (open) {
      this.closeNotifications();
      this.closeMobileMenu();
    }
  }
}
