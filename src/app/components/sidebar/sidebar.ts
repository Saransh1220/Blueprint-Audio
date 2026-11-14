import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, map } from 'rxjs/operators';
import { BRAND } from '../../core/config/brand';
import { Genre, Role } from '../../models';
import { AuthService, CartService } from '../../services';

interface SidebarLink {
  label: string;
  icon: string;
  route: string;
  query?: Record<string, string>;
  badge?: number;
}

interface SidebarGroup {
  title: string;
  links: SidebarLink[];
}

/** Left navigation for the browse side of the app: discover, catalog, library, selling. */
@Component({
  selector: 'app-sidebar',
  imports: [RouterLink],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SidebarComponent {
  readonly brand = BRAND;
  private readonly router = inject(Router);
  private readonly auth = inject(AuthService);
  private readonly cart = inject(CartService);

  readonly genresOpen = signal(false);
  readonly genres = Object.values(Genre);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.router.url),
    ),
    { initialValue: this.router.url },
  );

  readonly groups = computed<SidebarGroup[]>(() => {
    const user = this.auth.currentUser();
    const groups: SidebarGroup[] = [
      {
        title: 'Beats',
        links: [
          { label: 'Explore', icon: 'fa-compass', route: '/discover' },
          { label: 'All beats', icon: 'fa-music', route: '/explore' },
          {
            label: 'New releases',
            icon: 'fa-bolt',
            route: '/explore',
            query: { sort: 'newest' },
          },
        ],
      },
      {
        title: 'My library',
        links: [
          { label: 'Cart', icon: 'fa-cart-shopping', route: '/cart', badge: this.cart.count() },
          {
            label: 'Purchases',
            icon: 'fa-bag-shopping',
            route: user ? '/studio/purchases' : '/login',
          },
        ],
      },
    ];
    if (user?.role === Role.PRODUCER) {
      groups.push({
        title: 'Sell beats',
        links: [
          { label: 'Upload', icon: 'fa-cloud-arrow-up', route: '/upload' },
          { label: 'Studio', icon: 'fa-sliders', route: '/studio' },
        ],
      });
    }
    return groups;
  });

  readonly footerLinks: SidebarLink[] = [
    { label: 'Licensing', icon: 'fa-file-contract', route: '/licensing' },
    { label: 'Terms', icon: 'fa-scale-balanced', route: '/terms' },
  ];

  isActive(link: SidebarLink): boolean {
    const [path, qs = ''] = this.url().split('?');
    if (path.replace(/\/$/, '') !== link.route) return false;
    const params = new URLSearchParams(qs);
    if (link.query) return Object.entries(link.query).every(([k, v]) => params.get(k) === v);
    // "All beats" is active on /explore unless a more specific entry (sort / genre) claims it.
    if (link.route === '/explore') return !params.get('sort') && !params.get('genres');
    return true;
  }

  isGenreActive(genre: string): boolean {
    const [path, qs = ''] = this.url().split('?');
    return path === '/explore' && new URLSearchParams(qs).get('genres') === genre;
  }

  toggleGenres(): void {
    this.genresOpen.update((v) => !v);
  }
}
