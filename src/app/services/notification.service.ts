import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification.model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, map } from 'rxjs/operators';
import { of } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';
import { LabService } from './lab';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class NotificationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/notifications`;

  // Signals
  private _notifications = signal<Notification[]>([]);
  notifications = this._notifications.asReadonly();

  unreadCount = computed(() => {
    const notifications = this._notifications();
    return notifications ? notifications.filter((n) => !n.is_read).length : 0;
  });

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
        this.refresh();
      } else {
        this._notifications.set([]);
      }
    });
  }

  private addNotification(notification: Notification) {
    this._notifications.update((current) => [notification, ...current]);
  }

  refresh() {
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
        this._notifications.set(data || []);
      });
  }

  markAsRead(id: string) {
    // Optimistic update
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
      .subscribe();
  }

  markAllAsRead() {
    // Optimistic update
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
      .subscribe();
  }
}
