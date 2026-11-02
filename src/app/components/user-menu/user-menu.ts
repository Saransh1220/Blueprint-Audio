import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  effect,
  inject,
  model,
  NgZone,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';

import { Role } from '../../models';
import { AuthService, AuthzService } from '../../services';

export interface UserMenuLink {
  label: string;
  icon: string;
  route: string;
}

/**
 * The account button and the menu that opens from it: who you are, where you can go, the theme, and
 * log out. It owns its own closing (Escape, a press outside, choosing a link); the page can read or
 * set `open` to keep it in step with other popups.
 */
@Component({
  selector: 'app-user-menu',
  imports: [RouterLink],
  templateUrl: './user-menu.html',
  styleUrl: './user-menu.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserMenuComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly zone = inject(NgZone);
  private readonly auth = inject(AuthService);
  private readonly authz = inject(AuthzService);

  readonly open = model(false);

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  readonly user = this.auth.currentUser;
  readonly isProducer = computed(() => this.user()?.role === Role.PRODUCER);
  readonly displayName = computed(() => {
    const user = this.user();
    return user?.display_name || user?.name || 'User';
  });
  readonly initial = computed(() => this.user()?.name?.charAt(0) || 'U');
  readonly avatarImage = computed(() => {
    const url = this.user()?.avatar_url;
    return url ? `url(${url})` : null;
  });

  readonly links = computed<UserMenuLink[]>(() => [
    ...(this.isProducer()
      ? [
          { label: 'Studio overview', icon: 'fa-table-cells-large', route: '/studio/overview' },
          { label: 'Upload a beat', icon: 'fa-upload', route: '/upload' },
        ]
      : []),
    { label: 'My purchases', icon: 'fa-bag-shopping', route: '/studio/purchases' },
    { label: 'Settings', icon: 'fa-sliders', route: '/settings' },
    ...(this.authz.isSuperAdmin()
      ? [{ label: 'Admin console', icon: 'fa-shield-halved', route: '/admin' }]
      : []),
  ]);

  constructor() {
    // Escape and a press outside close it. The listeners exist only while it is open.
    effect((onCleanup) => {
      if (!this.open()) return;
      const onKey = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return;
        this.open.set(false);
        this.trigger()?.nativeElement.focus();
      };
      const onDown = (event: PointerEvent) => {
        if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
      };
      this.zone.runOutsideAngular(() => {
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onDown);
      });
      onCleanup(() => {
        document.removeEventListener('keydown', onKey);
        document.removeEventListener('pointerdown', onDown);
      });
    });
  }

  toggle(): void {
    this.open.update((open) => !open);
  }

  close(): void {
    this.open.set(false);
  }

  logout(): void {
    this.close();
    this.auth.logout();
  }
}
