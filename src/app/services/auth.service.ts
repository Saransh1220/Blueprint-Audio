import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';
import { ApiService } from '../core/services/api.service';
import { GetMeRequest, LoginRequest, RegisterRequest } from '../core/api/auth.requests';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'artist' | 'producer';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);

  currentUser = signal<User | null>(null);

  constructor() {
    this.checkSession();
  }

  checkSession() {
    const token = localStorage.getItem('token');
    if (token) {
      this.getMe().subscribe();
    }
  }

  login(credentials: { email: string; password: string }) {
    return this.api.execute(new LoginRequest(credentials)).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        this.getMe().subscribe();
      }),
    );
  }

  register(data: { email: string; password: string; name: string; role: string }) {
    return this.api.execute(new RegisterRequest(data)).pipe(
      switchMap(() => {
        // Automatically login and return the login observable
        return this.login({ email: data.email, password: data.password });
      }),
    );
  }

  getMe() {
    return this.api.execute(new GetMeRequest()).pipe(
      tap((user) => {
        this.currentUser.set(user);
      }),
      catchError((err) => {
        console.error('Error fetching user', err);
        this.logout();
        return of(null);
      }),
    );
  }

  logout() {
    localStorage.removeItem('token');
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }
}
