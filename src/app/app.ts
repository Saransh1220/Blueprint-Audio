import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './components';
import { FooterComponent } from './components/footer/footer';
import { LoadingBarComponent } from './components/loading-bar/loading-bar.component';
import { ModalComponent } from './components/modal/modal.component';
import { PlayerComponent } from './components/player/player';
import { PurchaseWarpComponent } from './components/purchase-warp/purchase-warp';
import { ToastComponent } from './components/toast/toast.component';
import { BRAND } from './core/config/brand';
import { BuyerCurrencyService } from './services/buyer-currency.service';
import { PlayerService } from './services/player.service';
import { SpecUploadMonitorService } from './services/spec-upload-monitor.service';
import { ThemeService } from './services/theme.service';
import { usesSidebarLayout } from './utils/sidebar-routes';
import { SidebarComponent } from './components/sidebar/sidebar';

@Component({
  selector: 'app-root',
  host: { '[class.payment-return-page]': 'isPaymentReturnRoute()' },
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    FooterComponent,
    PlayerComponent,
    ModalComponent,
    ToastComponent,
    LoadingBarComponent,
    PurchaseWarpComponent,
    SidebarComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly brand = BRAND;
  private router = inject(Router);
  // Dark-only: creating the service keeps the dark class on the page.
  private theme = inject(ThemeService);
  private specUploadMonitor = inject(SpecUploadMonitorService);
  private buyerCurrency = inject(BuyerCurrencyService);
  playerService = inject(PlayerService);

  constructor() {
    inject(Title).setTitle(BRAND.name);
    this.specUploadMonitor.resumePersisted();
    this.buyerCurrency.load().subscribe();
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 0);
    });
  }

  hasSidebar(): boolean {
    return usesSidebarLayout(this.router.url);
  }

  isStudioRoute(): boolean {
    return this.router.url.startsWith('/studio');
  }

  isHomeRoute(): boolean {
    return this.router.url.split(/[?#]/, 1)[0] === '/';
  }

  isUploadRoute(): boolean {
    return this.router.url === '/upload' || this.router.url.startsWith('/studio/upload');
  }

  isExploreRoute(): boolean {
    return this.router.url === '/explore' || this.router.url.startsWith('/explore?');
  }

  isPaymentReturnRoute(): boolean {
    return this.router.url.split(/[?#]/, 1)[0] === '/payment/return';
  }

  isCatalogRoute(): boolean {
    const path = this.router.url.split(/[?#]/, 1)[0];
    return path === '/loops' || path === '/sample-packs' || path.startsWith('/sample-packs/');
  }

  isBeatRoute(): boolean {
    const path = this.router.url.split(/[?#]/, 1)[0];
    if (path.startsWith('/beats/')) return true;

    const activeRoute = this.router.routerState.snapshot.root.firstChild?.routeConfig?.path;
    return activeRoute === 'beats/:id' || activeRoute === ':shortCode';
  }

  isAuthRoute(): boolean {
    return (
      this.router.url.startsWith('/login') ||
      this.router.url.startsWith('/register') ||
      this.router.url.startsWith('/verify-email') ||
      this.router.url.startsWith('/forgot-password') ||
      this.router.url.startsWith('/reset-password')
    );
  }

  shouldReservePlayerSpace(): boolean {
    return this.playerService.isVisible() && !this.isAuthRoute() && !this.isUploadRoute();
  }

  shouldReserveExpandedPlayerSpace(): boolean {
    return this.shouldReservePlayerSpace() && this.playerService.isExpanded();
  }
}
