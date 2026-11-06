import { HttpClient } from '@angular/common/http';
import { effect, Injectable, inject, OnDestroy } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { environment } from '../../environments/environment';
import { Notification } from '../models/notification.model';
import { AuthService } from './auth.service';
@Injectable({ providedIn: 'root' })
export class WebSocketService implements OnDestroy {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly messages = new Subject<Notification>();
  readonly messages$ = this.messages.asObservable();
  private socket: WebSocket | null = null;
  private ticketRequest?: Subscription;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private activeUserId: string | null = null;
  private generation = 0;
  constructor() {
    effect(() => {
      const id = this.auth.currentUser()?.id ?? null;
      if (id === this.activeUserId) return;
      this.disconnect();
      this.activeUserId = id;
      if (id) this.connect();
    });
  }
  connect() {
    if (!this.auth.currentUser() || this.ticketRequest || this.socket) return;
    const generation = this.generation;
    this.ticketRequest = this.http
      .post<{ ticket: string }>(`${environment.apiUrl}/ws/ticket`, {})
      .subscribe({
        next: (response) => {
          this.ticketRequest = undefined;
          if (generation !== this.generation || !this.auth.currentUser()) return;
          const socket = new WebSocket(
            `${environment.apiUrl.replace(/^http/, 'ws')}/ws?ticket=${encodeURIComponent(response.ticket)}`,
          );
          this.socket = socket;
          socket.onmessage = (event) => {
            if (generation !== this.generation) return;
            try {
              this.messages.next(JSON.parse(event.data));
            } catch {
              /* Ignore invalid frames. */
            }
          };
          socket.onclose = () => {
            if (this.socket === socket) this.socket = null;
            if (generation === this.generation) this.scheduleReconnect();
          };
          socket.onerror = () => socket.close();
        },
        error: () => {
          this.ticketRequest = undefined;
          if (generation === this.generation) this.scheduleReconnect();
        },
      });
  }
  private scheduleReconnect() {
    if (!this.auth.currentUser() || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, 5000);
  }
  disconnect() {
    this.generation++;
    this.ticketRequest?.unsubscribe();
    this.ticketRequest = undefined;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
    const socket = this.socket;
    this.socket = null;
    socket?.close();
  }
  ngOnDestroy() {
    this.disconnect();
    this.messages.complete();
  }
}
