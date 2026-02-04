import type { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { AuthComponent } from './pages/auth/auth.component';
import { BattleDetailsComponent } from './pages/battle-details/battle-details.component';
import { BattlesComponent } from './pages/battles/battles.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/home/home.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { SpecDetailsComponent } from './pages/spec-details/spec-details.component';
import { PurchasesComponent } from './pages/purchases/purchases.component';
import { UploadComponent } from './pages/upload/upload.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'battles', component: BattlesComponent },
  { path: 'battles/:id', component: BattleDetailsComponent },
  { path: 'beats/:id', component: SpecDetailsComponent },
  { path: 'login', component: AuthComponent, canActivate: [guestGuard] },
  { path: 'register', component: AuthComponent, canActivate: [guestGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [authGuard] },
  { path: 'upload', component: UploadComponent, canActivate: [authGuard] },
  { path: 'purchases', component: PurchasesComponent, canActivate: [authGuard] },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: '' },
];
