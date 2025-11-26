import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BattlesComponent } from './pages/battles/battles.component';
import { BattleDetailsComponent } from './pages/battle-details/battle-details.component';
import { AuthComponent } from './pages/auth/auth.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'battles', component: BattlesComponent },
  { path: 'battles/:id', component: BattleDetailsComponent },
  { path: 'login', component: AuthComponent },
  { path: 'register', component: AuthComponent },
  { path: '**', redirectTo: '' },
];
