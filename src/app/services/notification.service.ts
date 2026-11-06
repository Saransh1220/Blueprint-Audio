import { HttpClient } from '@angular/common/http';
import { effect, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification.model';
import { AuthService } from './auth.service';
import { LabService } from './lab';
import { ToastService } from './toast.service';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  // Signals
  private _notifications = signal<Notification[]>([]);
  notifications = this._notifications.asReadonly();

  private readonly _unreadCount = signal(0);
  readonly unreadCount = this._unreadCount.asReadonly();

  private wsService = inject(WebSocketService);
  private toastService = inject(ToastService);
  private labService = inject(LabService);
  private authService = inject(AuthService);

  constructor() {
    // Listen for realtime updates
    this.wsService.messages$.pipe(takeUntilDestroyed()).subscribe((msg: Notification) => {
      this.addNotification(msg);
      let variant: 'success' | 'error' | 'info' = 'info';
      if (msg.type === 'processing_complete') variant = 'success';
      if (msg.type === 'processing_failed') variant = 'error';

      this.toastService.show(msg.message, variant);

      if (msg.type === 'processing_complete' || msg.type === 'processing_failed') {
        this.labService.notifyRefresh();
      }
    });

    // React to auth changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user) {
        this._notifications.set([]);
        this._unreadCount.set(0);
        this.refresh();
      } else {
        this._notifications.set([]);
        this._unreadCount.set(0);
      }
    });
  }

  private addNotification(notification: Notification) {
    this._notifications.update((current) => [
      notification,
      ...current.filter((n) => n.id !== notification.id),
    ]);
    this.refreshUnreadCount();
  }

  refreshUnreadCount() {
    const userId = this.authService.currentUser()?.id;
    this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).subscribe({
      next: (response) => {
        if (
          userId === this.authService.currentUser()?.id &&
          Number.isFinite(response.count) &&
          response.count >= 0
        )
          this._unreadCount.set(response.count);
      },
      error: () => {},
    });
  }

  refresh() {
    const userId = this.authService.currentUser()?.id;
    this.refreshUnreadCount();
    this.http
      .get<{ data: Notification[] }>(this.apiUrl, { params: { limit: 10 } })
      .pipe(
        map((res) => res.data),
        catchError((err) => {
          console.error('Failed to fetch notifications', err);
          return of([]);
        }),
      )
      .subscribe((data) => {
        if (userId === this.authService.currentUser()?.id) this._notifications.set(data || []);
      });
  }

  markAsRead(id: string) {
    // Optimistic update; reconcile the authoritative count after the server response.
    this._notifications.update((list) =>
      list.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );

    this.http
      .patch(`${this.apiUrl}/${id}/read`, {})
      .pipe(
        catchError((err) => {
          // Revert on error
          console.error('Failed to mark as read', err);
          this.refresh();
          return of(null);
        }),
      )
      .subscribe(() => this.refreshUnreadCount());
  }

  markAllAsRead() {
    // Optimistic update; reconcile the authoritative count after the server response.
    this._notifications.update((list) => list.map((n) => ({ ...n, is_read: true })));

    this.http
      .patch(`${this.apiUrl}/read-all`, {})
      .pipe(
        catchError((err) => {
          console.error('Failed to mark all as read', err);
          this.refresh();
          return of(null);
        }),
      )
      .subscribe(() => this.refreshUnreadCount());
  }
}
