import { inject } from '@angular/core';
import type { Routes } from '@angular/router';
import { Router } from '@angular/router';
import { adminGuard } from './guards/admin.guard';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { Role } from './models';
import { AuthComponent } from './pages/auth/auth.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component';
import { BattleDetailsComponent } from './pages/battle-details/battle-details.component';
import { BattlesComponent } from './pages/battles/battles.component';
import { CartComponent } from './components/cart/cart.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/home/home.component';
import { SearchPageComponent } from './pages/search/search.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { StudioComponent } from './pages/studio/studio.component';
import { UploadComponent } from './pages/upload/upload.component';
import { AuthService } from './services';

import { unreleasedFeatureGuard } from './core/config/feature-availability';
import { UnavailableComponent } from './pages/unavailable/unavailable.component';
import { LegalComponent } from './pages/legal/legal.component';

export const routes: Routes = [
  { path: 'unavailable', component: UnavailableComponent },
  ...(['terms', 'privacy', 'licensing'] as const).map((path) => ({
    path,
    component: LegalComponent,
    data: { document: path },
  })),
  { path: '', component: HomeComponent },
  { path: 'cart', component: CartComponent },
  { path: 'explore', component: SearchPageComponent },
  {
    path: '@/:handle',
    loadComponent: () =>
      import('./pages/producer-profile/producer-profile.component').then(
        (m) => m.ProducerProfileComponent,
      ),
  },
  { path: 'search', redirectTo: 'explore', pathMatch: 'full' },
  {
    path: 'battles',
    canActivate: [unreleasedFeatureGuard],
    data: { feature: 'Battles' },
    component: BattlesComponent,
  },
  {
    path: 'battles/:id',
    canActivate: [unreleasedFeatureGuard],
    data: { feature: 'Battles' },
    component: BattleDetailsComponent,
  },
  {
    path: 'loops',
    canActivate: [unreleasedFeatureGuard],
    data: { feature: 'Loops' },
    loadComponent: () =>
      import('./pages/loops/loops-page/loops-page.component').then((m) => m.LoopsPageComponent),
  },
  {
    path: 'sample-packs',
    canActivate: [unreleasedFeatureGuard],
    data: { feature: 'Sample Packs' },
    loadComponent: () =>
      import('./pages/sample-packs/sample-packs-page/sample-packs-page.component').then(
        (m) => m.SamplePacksPageComponent,
      ),
  },
  {
    path: 'sample-packs/:slug',
    canActivate: [unreleasedFeatureGuard],
    data: { feature: 'Sample Packs' },
    loadComponent: () =>
      import('./pages/sample-pack-detail/sample-pack-detail-page/sample-pack-detail-page.component').then(
        (m) => m.SamplePackDetailPageComponent,
      ),
  },
  {
    path: 'beats/:id',
    loadComponent: () =>
      import('./pages/spec-details/spec-details.component').then((m) => m.SpecDetailsComponent),
  },
  {
    path: 'payment/return',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/payment-result/payment-result.component').then(
        (m) => m.PaymentResultComponent,
      ),
  },
  { path: 'login', component: AuthComponent, canActivate: [guestGuard] },
  { path: 'register', component: AuthComponent, canActivate: [guestGuard] },
  { path: 'verify-email', component: VerifyEmailComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },

  // ─── CREATOR TOOLS (standalone, producers only) ──────────────────────────
  {
    path: 'creator-tools',
    canActivate: [
      authGuard,
      () =>
        inject(AuthService).currentUser()?.role === Role.PRODUCER ||
        inject(Router).parseUrl('/explore'),
    ],
    loadComponent: () =>
      import('./pages/creator-tools/creator-tools.component').then((m) => m.CreatorToolsComponent),
  },
  { path: 'studio/tools', redirectTo: 'creator-tools', pathMatch: 'prefix' },

  // ─── STUDIO (unified producer workspace) ─────────────────────────────────
  {
    path: 'studio',
    component: StudioComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: () =>
          inject(AuthService).currentUser()?.role === Role.PRODUCER ? 'overview' : 'purchases',
        pathMatch: 'full',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-overview.component').then(
            (m) => m.StudioOverviewComponent,
          ),
      },
      {
        path: 'tracks',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-tracks.component').then(
            (m) => m.StudioTracksComponent,
          ),
      },
      {
        path: 'analytics',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-analytics.component').then(
            (m) => m.StudioAnalyticsComponent,
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-orders.component').then(
            (m) => m.StudioOrdersComponent,
          ),
      },
      {
        path: 'purchases',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-purchases.component').then(
            (m) => m.StudioPurchasesComponent,
          ),
      },
      {
        path: 'upload',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-upload.component').then(
            (m) => m.StudioUploadComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-profile.component').then(
            (m) => m.StudioProfileComponent,
          ),
      },
      {
        path: 'earnings',
        canActivate: [unreleasedFeatureGuard],
        data: { feature: 'Earnings' },
        loadComponent: () =>
          import('./pages/studio/tabs/studio-earnings.component').then(
            (m) => m.StudioEarningsComponent,
          ),
      },
      {
        path: 'messages',
        canActivate: [unreleasedFeatureGuard],
        data: { feature: 'Messages' },
        loadComponent: () =>
          import('./pages/studio/tabs/studio-messages.component').then(
            (m) => m.StudioMessagesComponent,
          ),
      },
      {
        path: 'settings-studio',
        canActivate: [unreleasedFeatureGuard],
        data: { feature: 'Settings Studio' },
        loadComponent: () =>
          import('./pages/studio/tabs/studio-settings.component').then(
            (m) => m.StudioSettingsComponent,
          ),
      },
    ],
  },

  // ─── Legacy routes (kept for backward compatibility) ───────────────────
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent),
  },

  // Short code route (catch-all before 404)
  {
    path: ':shortCode',
    loadComponent: () =>
      import('./pages/spec-details/spec-details.component').then((m) => m.SpecDetailsComponent),
  },

  { path: '**', redirectTo: '' },
];
