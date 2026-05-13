import { CommonModule } from '@angular/common';
import { Component, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, CartService, NotificationService } from '../../services';
import { Role } from '../../models';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';
import { StudioShellService } from '../../pages/studio/studio-shell.service';

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
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
  cartClick = output<void>();
  isMobileMenuOpen = false;
  cartService = inject(CartService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);
  private router = inject(Router);
  studioShell = inject(StudioShellService);
  globalSearchTerm = '';

  // Expose Role enum to template
  readonly Role = Role;

  // Notifications
  isNotificationsOpen = false;
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  notificationFilter = signal<NotificationKind>('all');
  private readonly locallyRead = signal<Set<string>>(new Set());
  private readonly referenceNotifications: HeaderNotificationItem[] = [
    {
      id: 'ref-sale-copper-saints',
      kind: 'sale',
      unread: true,
      avatar: '$',
      avatarClass: 'c-sun',
      text: 'License sold of Copper Saints.',
      accent: 'Premium WAV',
      time: '18m',
      amount: '+ Rs 6,639',
      license: 'Sam L.',
      artLetter: 'c',
      artGradient: 'linear-gradient(135deg,#c9b8ff,#ff3d5a)',
    },
    {
      id: 'ref-message-meridian',
      kind: 'message',
      unread: true,
      avatar: 'm',
      avatarClass: 'c-cobalt',
      text: 'Meridian sent a message',
      accent: '"want to collab on the Friday drop?"',
      time: '1h',
    },
    {
      id: 'ref-cart-ghostwire',
      kind: 'cart',
      unread: false,
      avatar: 'c',
      avatarClass: 'c-cream',
      text: 'Ghostwire was added to',
      accent: '3 carts',
      time: '3h',
    },
    {
      id: 'ref-sale-lavender',
      kind: 'sale',
      unread: false,
      avatar: '$',
      avatarClass: 'c-sun',
      text: 'License sold of Lavender Static.',
      accent: 'Basic MP3',
      time: '5h',
      amount: '+ Rs 2,074',
      license: 'Alex K.',
      artLetter: 'l',
      artGradient: 'linear-gradient(135deg,#f7cf47,#ff3d5a)',
    },
    {
      id: 'ref-follow-rufio',
      kind: 'follow',
      unread: false,
      avatar: 'r',
      avatarClass: 'c-lavender',
      text: 'Rufio Ash started following you.',
      time: '8h',
    },
    {
      id: 'ref-milestone-violet',
      kind: 'milestone',
      unread: false,
      avatar: '*',
      avatarClass: 'c-sun',
      text: 'Violet Hour just hit',
      accent: '4,000 plays',
      time: '1d',
    },
    {
      id: 'ref-wishlist-violet',
      kind: 'wishlist',
      unread: false,
      avatar: 'w',
      avatarClass: 'c-lavender',
      text: 'Violet Hour was wishlisted',
      accent: '9 times',
      time: '1d',
    },
  ];
  notificationItems = computed(() => [
    ...this.notifications().map((n): HeaderNotificationItem => {
      const complete = n.type === 'processing_complete' || n.type === 'success';
      const failed = n.type === 'processing_failed' || n.type === 'error';
      return {
        id: n.id,
        kind: failed || complete ? 'system' : 'message',
        unread: !n.is_read && !this.locallyRead().has(n.id),
        avatar: failed ? '!' : complete ? 'ok' : 'i',
        avatarClass: failed ? 'c-hot' : complete ? 'c-lime' : 'c-cobalt',
        text: n.title || 'Notification',
        accent: n.message,
        time: this.relativeNotificationTime(n.created_at),
        live: true,
      };
    }),
    ...this.referenceNotifications.map((item) => ({
      ...item,
      unread: item.unread && !this.locallyRead().has(item.id),
    })),
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
      unread: items.filter((item) => item.unread).length,
      sale: items.filter((item) => item.kind === 'sale').length,
      message: items.filter((item) => item.kind === 'message').length,
    };
  });

  isStudioRoute() {
    return this.router.url.startsWith('/studio');
  }

  isStudioSection(path: string) {
    return this.router.url === `/studio/${path}`;
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
    this.locallyRead.update((read) => new Set(read).add(id));
    if (!id.startsWith('ref-')) {
      this.notificationService.markAsRead(id);
    }
  }

  markAllAsRead() {
    this.locallyRead.set(new Set(this.notificationItems().map((item) => item.id)));
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
}
