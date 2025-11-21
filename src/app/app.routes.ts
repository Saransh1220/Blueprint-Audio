import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { BattlesComponent } from './pages/battles/battles.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'battles', component: BattlesComponent },
  { path: '**', redirectTo: '' },
];
