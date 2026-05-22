import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/coins/coin-list/coin-list.component').then((m) => m.CoinListComponent),
  },
  {
    path: 'coin/:id',
    loadComponent: () =>
      import('./features/coins/coin-detail/coin-detail.component').then((m) => m.CoinDetailComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/profile/profile.component').then((m) => m.ProfileComponent),
  },
  { path: '**', redirectTo: '' },
];
