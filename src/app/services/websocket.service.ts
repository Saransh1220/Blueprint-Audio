import { Injectable, inject, signal, effect } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private messagesSubject = new Subject<any>();
  messages$ = this.messagesSubject.asObservable();

  private authService = inject(AuthService);
  private reconnectInterval = 5000;
  private isConnected = signal(false);

  constructor() {
    // React to auth state changes
    effect(() => {
      const user = this.authService.currentUser();
      if (user && !this.isConnected()) {
        this.connect();
      } else if (!user && this.isConnected()) {
        this.disconnect();
      }
    });
  }

  connect() {
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    const token = localStorage.getItem('token');
    const user = this.authService.currentUser();

    if (!token || !user) return;

    // Use ws:// or wss:// based on protocol
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // Use environment api url processing
    const apiUrl = environment.apiUrl.replace(/^http/, 'ws');

    console.log('Attempting WebSocket connection to:', `${apiUrl}/ws?token=${token}`);
    this.socket = new WebSocket(`${apiUrl}/ws?token=${token}`);

    this.socket.onopen = () => {
      console.log('WebSocket Connected to ' + apiUrl);
      this.isConnected.set(true);
    };

    this.socket.onmessage = (event) => {
      console.log('WebSocket Message Received (Raw):', event.data);
      try {
        const message = JSON.parse(event.data);
        console.log('WebSocket Message Parsed:', message);
        this.messagesSubject.next(message);
      } catch (e) {
        console.error('Failed to parse websocket message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket Disconnected');
      // Only reconnect if we intended to stay connected
      if (this.isConnected()) {
        this.isConnected.set(false);
        this.socket = null;
        setTimeout(() => this.connect(), this.reconnectInterval);
      } else {
        this.socket = null;
      }
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket Error', error);
      this.socket?.close();
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}
