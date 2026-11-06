import { HttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

class Socket {
  static instances: Socket[] = [];
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  onerror?: () => void;
  close = vi.fn();
  constructor(readonly url: string) {
    Socket.instances.push(this);
  }
}
describe('WebSocket ticket authentication', () => {
  let ticket: Subject<{ ticket: string }>;
  let user = signal<any>(null);
  let post: ReturnType<typeof vi.fn>;
  beforeEach(() => {
    Socket.instances = [];
    ticket = new Subject();
    user = signal<any>(null);
    post = vi.fn(() => ticket);
    vi.stubGlobal('WebSocket', Socket);
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: HttpClient, useValue: { post } },
        { provide: AuthService, useValue: { currentUser: user } },
      ],
    });
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });
  it('exchanges bearer-authenticated HTTP for a ticket without reading a URL token', () => {
    const service = TestBed.inject(WebSocketService);
    user.set({ id: 'u1' });
    service.connect();
    expect(post).toHaveBeenCalledWith(expect.stringContaining('/ws/ticket'), {});
    ticket.next({ ticket: 'one-use' });
    expect(Socket.instances[0].url).toContain('/ws?ticket=one-use');
    expect(Socket.instances[0].url).not.toContain('token=');
    const receive = vi.fn();
    service.messages$.subscribe(receive);
    Socket.instances[0].onmessage!({ data: JSON.stringify({ id: 'notification-1' }) });
    expect(receive).toHaveBeenCalledWith({ id: 'notification-1' });
  });
  it('does not open a connection after logout while a ticket is pending', () => {
    const service = TestBed.inject(WebSocketService);
    user.set({ id: 'u1' });
    service.connect();
    service.disconnect();
    user.set(null);
    ticket.next({ ticket: 'stale' });
    expect(Socket.instances).toHaveLength(0);
  });
  it('retries with a fresh ticket after disconnect and cancels reconnects on logout', () => {
    const service = TestBed.inject(WebSocketService);
    user.set({ id: 'u1' });
    service.connect();
    ticket.next({ ticket: 'first' });
    Socket.instances[0].onclose!();
    vi.advanceTimersByTime(5000);
    expect(post).toHaveBeenCalledTimes(2);
    service.disconnect();
    user.set(null);
    vi.advanceTimersByTime(10000);
    expect(post).toHaveBeenCalledTimes(2);
  });
  it('ignores invalid frames and prevents duplicate parallel ticket requests', () => {
    const service = TestBed.inject(WebSocketService);
    user.set({ id: 'u1' });
    service.connect();
    service.connect();
    expect(post).toHaveBeenCalledTimes(1);
    ticket.next({ ticket: 'valid' });
    const receive = vi.fn();
    service.messages$.subscribe(receive);
    Socket.instances[0].onmessage!({ data: 'invalid JSON' });
    expect(receive).not.toHaveBeenCalled();
  });
});
