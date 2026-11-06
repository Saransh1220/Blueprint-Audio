import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { STUDIO_ITEMS, menuItemsFor } from '../../components/nav-menu/nav-menu.items';
import { Role } from '../../models';
import { AuthService } from '../../services';
import { StudioShellService } from './studio-shell.service';

@Component({
  selector: 'app-studio',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './studio.component.html',
  styleUrl: './studio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioComponent {
  authService = inject(AuthService);
  private studioShell = inject(StudioShellService);
  readonly Role = Role;

  currentUser = this.authService.currentUser;
  isMobileNavOpen = this.studioShell.isMobileNavOpen;
  readonly availableNavItems = computed(() =>
    menuItemsFor(STUDIO_ITEMS, this.currentUser()?.role === Role.PRODUCER),
  );
  readonly navItems = computed(() =>
    this.availableNavItems().map((item) => ({
      path: item.route.replace('/studio/', ''),
      label: item.label,
    })),
  );

  displayName = computed(() => {
    const user = this.currentUser();
    return user?.display_name || user?.name || 'Producer';
  });

  firstName = computed(() => {
    const parts = this.displayName().split(' ');
    return parts[0] || 'Producer';
  });

  lastName = computed(() => {
    const parts = this.displayName().split(' ');
    return parts.slice(1).join(' ') || '';
  });

  handle = computed(() => {
    const user = this.currentUser();
    return user?.name?.toLowerCase().replace(/\s+/g, '.') || 'producer';
  });

  avatarUrl = computed(() => this.currentUser()?.avatar_url || null);

  greeting = computed(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  });

  todayDate = computed(() => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  });

  sidebarStats = computed(() => ({
    beats: 0,
    followers: 0,
  }));

  toggleMobileNav() {
    this.studioShell.toggleMobileNav();
  }

  closeMobileNav() {
    this.studioShell.closeMobileNav();
  }

  logout() {
    this.closeMobileNav();
    this.authService.logout();
  }
}
