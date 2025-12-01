import type { Routes } from '@angular/router';
import { AuthComponent } from './pages/auth/auth.component';
import { BattleDetailsComponent } from './pages/battle-details/battle-details.component';
import { BattlesComponent } from './pages/battles/battles.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { HomeComponent } from './pages/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'battles', component: BattlesComponent },
  { path: 'battles/:id', component: BattleDetailsComponent },
  { path: 'login', component: AuthComponent },
  { path: 'register', component: AuthComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: '**', redirectTo: '' },
];
