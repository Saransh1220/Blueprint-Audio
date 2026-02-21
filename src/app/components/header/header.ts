import { Component, inject, output } from '@angular/core';

import { RouterLink, RouterLinkActive } from '@angular/router';
import { Role } from '../../models';
import { AuthService, CartService } from '../../services';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './header.html',
  styleUrls: ['./header.scss'],
})
export class HeaderComponent {
  cartClick = output<void>();
  isMobileMenuOpen = false;
  cartService = inject(CartService);
  authService = inject(AuthService);

  // Expose Role enum to template
  readonly Role = Role;

  toggleMobileMenu() {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
  }

  closeMobileMenu() {
    this.isMobileMenuOpen = false;
  }

  isUserMenuOpen = false;

  toggleUserMenu() {
    this.isUserMenuOpen = !this.isUserMenuOpen;
  }

  closeUserMenu() {
    this.isUserMenuOpen = false;
  }
}
