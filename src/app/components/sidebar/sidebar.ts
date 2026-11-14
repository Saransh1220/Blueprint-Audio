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
            route: '/discover',
            query: { section: 'new_releases' },
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
          { label: 'Studio', icon: 'fa-sliders', route: '/studio/overview' },
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
    const { queryParamMap } = this.router.parseUrl(this.url());
    if (!this.matchesRoute(link.route)) return false;
    if (link.query) return Object.entries(link.query).every(([k, v]) => queryParamMap.get(k) === v);
    // Genre links take precedence over the full catalog link.
    if (link.route === '/explore') return !queryParamMap.has('genres');
    return link.route !== '/discover' || queryParamMap.get('section') !== 'new_releases';
  }

  isGenreActive(genre: string): boolean {
    const { queryParamMap } = this.router.parseUrl(this.url());
    return (
      this.matchesRoute('/explore') &&
      (queryParamMap.get('genres') ?? '').split(',').includes(genre)
    );
  }

  private matchesRoute(route: string): boolean {
    return this.router.isActive(route, {
      paths: 'exact',
      queryParams: 'ignored',
      fragment: 'ignored',
      matrixParams: 'ignored',
    });
  }

  toggleGenres(): void {
    this.genresOpen.update((v) => !v);
  }
}
