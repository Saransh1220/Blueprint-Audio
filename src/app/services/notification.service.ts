import { Injectable, inject, signal, computed, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification.model';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, map, startWith, tap } from 'rxjs/operators';
import { of, interval, switchMap } from 'rxjs';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';
import { LabService } from './lab';

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

  constructor() {
    // Initial fetch
    this.refresh();

    // Listen for realtime updates
    this.wsService.messages$.subscribe((msg: Notification) => {
      console.log('Realtime notification:', msg);
      this.addNotification(msg);
      this.toastService.show(msg.message, msg.type === 'processing_failed' ? 'error' : 'success');

      if (msg.type === 'processing_complete' || msg.type === 'processing_failed') {
        this.labService.notifyRefresh();
      }
    });
  }

  private addNotification(notification: Notification) {
    this._notifications.update((current) => [notification, ...current]);
  }

  refresh() {
    this.http
      .get<{ data: Notification[] }>(this.apiUrl)
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
