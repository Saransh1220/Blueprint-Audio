import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { NotificationService } from './notification.service';
import { Notification } from '../models/notification.model';
import { WebSocketService } from './websocket.service';
import { ToastService } from './toast.service';
import { LabService } from './lab';

describe('NotificationService', () => {
  const makeNotification = (overrides?: Partial<Notification>): Notification => ({
    id: 'n-1',
    user_id: 'u-1',
    title: 'Done',
    message: 'Upload complete',
    type: 'processing_complete',
    is_read: false,
    created_at: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  });

  function setup(options?: {
    getImpl?: ReturnType<typeof vi.fn>;
    patchImpl?: ReturnType<typeof vi.fn>;
  }) {
    const wsSubject = new Subject<Notification>();
    const get = options?.getImpl ?? vi.fn().mockReturnValue(of({ data: [] }));
    const patch = options?.patchImpl ?? vi.fn().mockReturnValue(of({}));
    const show = vi.fn();
    const notifyRefresh = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: HttpClient, useValue: { get, patch } },
        { provide: WebSocketService, useValue: { messages$: wsSubject.asObservable() } },
        { provide: ToastService, useValue: { show } },
        { provide: LabService, useValue: { notifyRefresh } },
      ],
    });

    return {
      service: TestBed.inject(NotificationService),
      wsSubject,
      get,
      patch,
      show,
      notifyRefresh,
    };
  }

  it('refreshes on construction and computes unread count', () => {
    const unread = makeNotification({ id: 'n-1', is_read: false });
    const read = makeNotification({ id: 'n-2', is_read: true });
    const get = vi.fn().mockReturnValue(of({ data: [unread, read] }));

    const { service } = setup({ getImpl: get });

    expect(get).toHaveBeenCalledTimes(1);
    expect(service.notifications()).toEqual([unread, read]);
    expect(service.unreadCount()).toBe(1);
  });

  it('handles realtime message, prepends notification, and shows success toast', () => {
    const { service, wsSubject, show, notifyRefresh } = setup();
    const msg = makeNotification({ id: 'n-live', type: 'success', message: 'Heads up' });

    wsSubject.next(msg);

    expect(service.notifications()[0]).toEqual(msg);
    expect(show).toHaveBeenCalledWith('Heads up', 'success');
    expect(notifyRefresh).not.toHaveBeenCalled();
  });

  it('handles processing_failed realtime message with error toast and refresh trigger', () => {
    const { wsSubject, show, notifyRefresh } = setup();
    const msg = makeNotification({ id: 'n-fail', type: 'processing_failed', message: 'Failed' });

    wsSubject.next(msg);

    expect(show).toHaveBeenCalledWith('Failed', 'error');
    expect(notifyRefresh).toHaveBeenCalledTimes(1);
  });

  it('handles processing_complete realtime message and triggers refresh', () => {
    const { wsSubject, notifyRefresh } = setup();
    const msg = makeNotification({ id: 'n-ok', type: 'processing_complete' });

    wsSubject.next(msg);

    expect(notifyRefresh).toHaveBeenCalledTimes(1);
  });

  it('refresh handles http error by setting empty list', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const get = vi.fn().mockReturnValue(throwError(() => new Error('nope')));

    const { service } = setup({ getImpl: get });

    expect(service.notifications()).toEqual([]);
    expect(errorSpy).toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it('markAsRead does optimistic update and sends patch', () => {
    const initial = [
      makeNotification({ id: 'n-1', is_read: false }),
      makeNotification({ id: 'n-2', is_read: false }),
    ];
    const get = vi.fn().mockReturnValue(of({ data: initial }));
    const patch = vi.fn().mockReturnValue(of({}));

    const { service } = setup({ getImpl: get, patchImpl: patch });

    service.markAsRead('n-1');

    expect(service.notifications()[0].is_read).toBe(true);
    expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/notifications\/n-1\/read$/), {});
  });

  it('markAsRead refreshes on patch error', () => {
    const initial = [makeNotification({ id: 'n-1', is_read: false })];
    const get = vi.fn().mockReturnValue(of({ data: initial }));
    const patch = vi.fn().mockReturnValue(throwError(() => new Error('patch failed')));

    const { service } = setup({ getImpl: get, patchImpl: patch });
    const refreshSpy = vi.spyOn(service, 'refresh');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.markAsRead('n-1');

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });

  it('markAllAsRead does optimistic update and sends patch', () => {
    const initial = [
      makeNotification({ id: 'n-1', is_read: false }),
      makeNotification({ id: 'n-2', is_read: false }),
    ];
    const get = vi.fn().mockReturnValue(of({ data: initial }));
    const patch = vi.fn().mockReturnValue(of({}));

    const { service } = setup({ getImpl: get, patchImpl: patch });

    service.markAllAsRead();

    expect(service.notifications().every((n) => n.is_read)).toBe(true);
    expect(patch).toHaveBeenCalledWith(expect.stringMatching(/\/notifications\/read-all$/), {});
  });

  it('markAllAsRead refreshes on patch error', () => {
    const initial = [makeNotification({ id: 'n-1', is_read: false })];
    const get = vi.fn().mockReturnValue(of({ data: initial }));
    const patch = vi.fn().mockReturnValue(throwError(() => new Error('patch failed')));

    const { service } = setup({ getImpl: get, patchImpl: patch });
    const refreshSpy = vi.spyOn(service, 'refresh');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    service.markAllAsRead();

    expect(refreshSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalled();

    errorSpy.mockRestore();
  });
});
