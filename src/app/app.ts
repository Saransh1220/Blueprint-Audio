import { CommonModule } from '@angular/common';
import { Component, inject, ViewChild } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { HeaderComponent } from './components';
import { CartComponent } from './components/cart/cart.component';
import { FooterComponent } from './components/footer/footer';
import { LoadingBarComponent } from './components/loading-bar/loading-bar.component';
import { ModalComponent } from './components/modal/modal.component';
import { PlayerComponent } from './components/player/player';
import { ToastComponent } from './components/toast/toast.component';
import { PlayerService } from './services/player.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    HeaderComponent,
    FooterComponent,
    PlayerComponent,
    CartComponent,
    ModalComponent,
    ToastComponent,
    LoadingBarComponent,
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.scss'],
})
export class AppComponent {
  private router = inject(Router);
  playerService = inject(PlayerService);

  @ViewChild(CartComponent) cart!: CartComponent;

  constructor() {
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }, 0);
    });
  }

  toggleCart() {
    if (this.cart) {
      this.cart.toggle();
    }
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
