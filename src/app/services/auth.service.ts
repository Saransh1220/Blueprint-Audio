import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, switchMap, tap } from 'rxjs';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'artist' | 'producer';
}

interface LoginResponse {
  token: string;
}

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = environment.apiUrl;

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
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials).pipe(
      tap((res) => {
        localStorage.setItem('token', res.token);
        this.getMe().subscribe();
      }),
    );
  }

  register(data: { email: string; password: string; name: string; role: string }) {
    return this.http.post<User>(`${this.apiUrl}/register`, data).pipe(
      switchMap(() => {
        // Automatically login and return the login observable
        return this.login({ email: data.email, password: data.password });
      }),
    );
  }

  getMe() {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
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
