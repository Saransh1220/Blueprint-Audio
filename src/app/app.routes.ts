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
import { CatalogEmbedComponent } from './pages/catalog-embed/catalog-embed.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/home/home.component';
import { SearchPageComponent } from './pages/search/search.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { StudioComponent } from './pages/studio/studio.component';
import { UploadComponent } from './pages/upload/upload.component';
import { AuthService } from './services';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'explore', component: SearchPageComponent },
  {
    path: '@/:handle',
    loadComponent: () =>
      import('./pages/producer-profile/producer-profile.component').then(
        (m) => m.ProducerProfileComponent,
      ),
  },
  { path: 'search', redirectTo: 'explore', pathMatch: 'full' },
  { path: 'battles', component: BattlesComponent },
  { path: 'battles/:id', component: BattleDetailsComponent },
  {
    path: 'loops',
    component: CatalogEmbedComponent,
    data: { src: '/mockups/loops.html', title: 'Loops' },
  },
  {
    path: 'sample-packs',
    component: CatalogEmbedComponent,
    data: { src: '/mockups/sample-packs.html', title: 'Sample Packs' },
  },
  {
    path: 'sample-packs/:slug',
    component: CatalogEmbedComponent,
    data: { src: '/mockups/sample-pack-detail.html', title: 'Violet Hour Essentials' },
  },
  {
    path: 'beats/:id',
    loadComponent: () =>
      import('./pages/spec-details/spec-details.component').then((m) => m.SpecDetailsComponent),
  },
  { path: 'login', component: AuthComponent, canActivate: [guestGuard] },
  { path: 'register', component: AuthComponent, canActivate: [guestGuard] },
  { path: 'verify-email', component: VerifyEmailComponent, canActivate: [guestGuard] },
  { path: 'forgot-password', component: ForgotPasswordComponent, canActivate: [guestGuard] },
  { path: 'reset-password', component: ResetPasswordComponent, canActivate: [guestGuard] },

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
        path: 'tools',
        canActivate: [
          () =>
            inject(AuthService).currentUser()?.role === Role.PRODUCER ||
            inject(Router).parseUrl('/studio/purchases'),
        ],
        children: [
          { path: '', redirectTo: 'visualizer', pathMatch: 'full' },
          {
            path: 'visualizer',
            loadComponent: () =>
              import('./pages/studio/tabs/studio-visualizer.component').then(
                (m) => m.StudioVisualizerComponent,
              ),
          },
        ],
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
        loadComponent: () =>
          import('./pages/studio/tabs/studio-earnings.component').then(
            (m) => m.StudioEarningsComponent,
          ),
      },
      {
        path: 'messages',
        loadComponent: () =>
          import('./pages/studio/tabs/studio-messages.component').then(
            (m) => m.StudioMessagesComponent,
          ),
      },
      {
        path: 'settings-studio',
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
