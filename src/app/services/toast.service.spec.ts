import { ToastService } from './toast.service';

describe('ToastService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds and auto-removes a toast after duration', () => {
    const service = new ToastService();

    service.show('Saved', 'success', 1000);

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].message).toBe('Saved');

    vi.advanceTimersByTime(1000);
    expect(service.toasts()).toHaveLength(0);
  });

  it('exposes convenience methods for success, error, and info', () => {
    const service = new ToastService();

    service.success('ok', 5000);
    service.error('bad', 5000);
    service.info('heads up', 5000);

    expect(service.toasts().map((t) => t.type)).toEqual(['success', 'error', 'info']);
    expect(service.toasts().map((t) => t.id)).toEqual([0, 1, 2]);
  });

  it('removes toast by id', () => {
    const service = new ToastService();
    service.show('A', 'info', 10000);
    service.show('B', 'info', 10000);

    const firstId = service.toasts()[0].id;
    service.remove(firstId);

    expect(service.toasts()).toHaveLength(1);
    expect(service.toasts()[0].message).toBe('B');
  });
});
