import { CommonModule } from '@angular/common';
import { Component, inject, output, signal } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService, CartService, NotificationService } from '../../services';
import { Role } from '../../models';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
  cartClick = output<void>();
  isMobileMenuOpen = false;
  cartService = inject(CartService);
  authService = inject(AuthService);
  notificationService = inject(NotificationService);

  // Expose Role enum to template
  readonly Role = Role;

  // Notifications
  isNotificationsOpen = false;
  notifications = this.notificationService.notifications;
  unreadCount = this.notificationService.unreadCount;
  // Trigger recompile for type check

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
