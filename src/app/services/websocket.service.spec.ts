import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { WebSocketService } from './websocket.service';

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;
  static instances: MockWebSocket[] = [];

  url: string;
  readyState = MockWebSocket.CONNECTING;
  onopen: ((this: WebSocket, ev: Event) => any) | null = null;
  onmessage: ((this: WebSocket, ev: MessageEvent<any>) => any) | null = null;
  onclose: ((this: WebSocket, ev: CloseEvent) => any) | null = null;
  onerror: ((this: WebSocket, ev: Event) => any) | null = null;
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED;
  });

  constructor(url: string) {
    this.url = url;
    MockWebSocket.instances.push(this);
  }
}

describe('WebSocketService', () => {
  const originalWebSocket = globalThis.WebSocket;
  const originalWindowWebSocket = window.WebSocket;

  beforeEach(() => {
    MockWebSocket.instances = [];
    vi.useFakeTimers();
    (globalThis as any).WebSocket = MockWebSocket;
    (window as any).WebSocket = MockWebSocket;
  });

  afterEach(() => {
    vi.useRealTimers();
    (globalThis as any).WebSocket = originalWebSocket;
    (window as any).WebSocket = originalWindowWebSocket;
    vi.restoreAllMocks();
  });

  function setup(user: any, token: string | null = 'token-1') {
    const userSignal = signal<any>(user);
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
      if (key === 'token') return token;
      return null;
    });

    TestBed.configureTestingModule({
      providers: [
        WebSocketService,
        { provide: AuthService, useValue: { currentUser: userSignal } },
      ],
    });

    return {
      service: TestBed.inject(WebSocketService),
      userSignal,
      getItemSpy,
    };
  }

  it('connects when user and token exist', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();

    expect(MockWebSocket.instances).toHaveLength(1);
    expect(MockWebSocket.instances[0].url).toBe(
      `${environment.apiUrl.replace(/^http/, 'ws')}/ws?token=abc123`,
    );
  });

  it('does not connect when token is missing', () => {
    const { service, userSignal } = setup(null, null);
    userSignal.set({ id: 'u-1' });
    service.connect();

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('does not connect when user is missing', () => {
    const { service } = setup(null, 'abc123');
    service.connect();

    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('returns early when socket already open or connecting', () => {
    const { service } = setup(null, 'abc123');

    (service as any).socket = { readyState: MockWebSocket.OPEN };
    service.connect();
    expect(MockWebSocket.instances).toHaveLength(0);

    (service as any).socket = { readyState: MockWebSocket.CONNECTING };
    service.connect();
    expect(MockWebSocket.instances).toHaveLength(0);
  });

  it('sets connected state on open and emits parsed messages', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();
    const socket = MockWebSocket.instances[0];
    const nextSpy = vi.fn();
    service.messages$.subscribe(nextSpy);

    socket.onopen?.({} as Event);
    expect((service as any).isConnected()).toBe(true);

    socket.onmessage?.({ data: JSON.stringify({ id: 'n-1' }) } as MessageEvent);
    expect(nextSpy).toHaveBeenCalledWith({ id: 'n-1' });
  });

  it('logs parse errors for invalid websocket messages', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();
    const socket = MockWebSocket.instances[0];
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    socket.onmessage?.({ data: '{bad-json' } as MessageEvent);

    expect(errorSpy).toHaveBeenCalled();
  });

  it('closes socket on error', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();
    const socket = MockWebSocket.instances[0];

    socket.onerror?.({} as Event);

    expect(socket.close).toHaveBeenCalledTimes(1);
  });

  it('reconnects after close', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();
    const socket = MockWebSocket.instances[0];

    socket.onopen?.({} as Event);
    expect((MockWebSocket.instances[0] as any).readyState).toBe(MockWebSocket.CONNECTING);

    socket.onclose?.({} as CloseEvent);
    expect(MockWebSocket.instances).toHaveLength(1);

    vi.advanceTimersByTime(5000);
    expect(MockWebSocket.instances).toHaveLength(2);
  });

  it('disconnect closes existing socket and clears reference', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();
    const socket = MockWebSocket.instances[0];

    service.disconnect();

    expect(socket.close).toHaveBeenCalledTimes(1);
    expect((service as any).socket).toBeNull();
  });

  it('effect disconnects when user becomes null while connected', () => {
    const { service, userSignal } = setup(null, 'abc123');
    userSignal.set({ id: 'u-1' });
    service.connect();
    const socket = MockWebSocket.instances[0];

    (service as any).isConnected.set(true);
    (service as any).socket = socket;
    userSignal.set(null);
    (TestBed as any).flushEffects?.();

    expect(socket.close).toHaveBeenCalled();
    expect((service as any).socket).toBeNull();
  });

  it('disconnect is a no-op when socket is absent', () => {
    const { service } = setup(null, 'abc123');

    expect(() => service.disconnect()).not.toThrow();
  });
});
