import type { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { AuthComponent } from './pages/auth/auth.component';
import { BattleDetailsComponent } from './pages/battle-details/battle-details.component';
import { BattlesComponent } from './pages/battles/battles.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { UploadComponent } from './pages/upload/upload.component';
import { SearchPageComponent } from './pages/search/search.component';
import { StudioComponent } from './pages/studio/studio.component';
import { VerifyEmailComponent } from './pages/auth/verify-email/verify-email.component';
import { ForgotPasswordComponent } from './pages/auth/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/auth/reset-password/reset-password.component';
import { AuthService } from './services';
import { Role } from './models';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'search', component: SearchPageComponent },
  { path: 'battles', component: BattlesComponent },
  { path: 'battles/:id', component: BattleDetailsComponent },
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
  { path: '**', redirectTo: '' },
];
