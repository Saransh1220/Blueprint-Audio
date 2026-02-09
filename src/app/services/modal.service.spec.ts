import { ModalService } from './modal.service';

class DummyComponent {}

describe('ModalService', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens modal and locks body scroll', () => {
    const service = new ModalService();

    service.open(DummyComponent, 'Edit Spec', { id: 'spec-1' });

    expect(service.isOpen()).toBe(true);
    expect(service.state()?.title).toBe('Edit Spec');
    expect(service.state()?.data).toEqual({ id: 'spec-1' });
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes modal and clears state after animation delay', () => {
    const service = new ModalService();
    service.open(DummyComponent);

    service.close();

    expect(service.isOpen()).toBe(false);
    expect(service.state()).not.toBeNull();
    expect(document.body.style.overflow).toBe('');

    vi.advanceTimersByTime(300);
    expect(service.state()).toBeNull();
  });
});
