import { ConfirmDialogComponent } from './confirm-dialog.component';
import { TestBed } from '@angular/core/testing';

describe('ConfirmDialogComponent', () => {
  it('opens with defaults and handles confirm/cancel', () => {
    TestBed.configureTestingModule({});
    const component = TestBed.runInInjectionContext(() => new ConfirmDialogComponent());
    const confirmSpy = vi.fn();
    const cancelSpy = vi.fn();
    component.confirmed.subscribe(confirmSpy);
    component.cancelled.subscribe(cancelSpy);

    component.open({ title: 'Delete', message: 'Sure?' });
    expect(component.isOpen()).toBe(true);
    expect(component.data().confirmText).toBe('Confirm');
    expect(component.data().cancelText).toBe('Cancel');
    expect(component.data().type).toBe('danger');

    component.onConfirm();
    expect(confirmSpy).toHaveBeenCalled();
    expect(component.isOpen()).toBe(false);

    component.open({ title: 'Delete', message: 'Sure?', type: 'warning' });
    component.onCancel();
    expect(cancelSpy).toHaveBeenCalled();
    expect(component.isOpen()).toBe(false);
  });
});
