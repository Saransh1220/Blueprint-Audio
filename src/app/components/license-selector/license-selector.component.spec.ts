import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CartService } from '../../services/cart.service';
import { ModalService } from '../../services/modal.service';
import { ToastService } from '../../services/toast.service';
import { PaymentService } from '../../services/payment.service';
import { LicenseSelectorComponent } from './license-selector.component';

describe('LicenseSelectorComponent', () => {
  const addItem = vi.fn();
  const close = vi.fn();
  const show = vi.fn();
  const initiatePayment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    initiatePayment.mockReturnValue(of({}));
    TestBed.configureTestingModule({
      providers: [
        { provide: CartService, useValue: { addItem } },
        { provide: ModalService, useValue: { close } },
        { provide: ToastService, useValue: { show } },
        { provide: PaymentService, useValue: { initiatePayment } },
      ],
    });
  });

  it('adds selected license to cart and starts buy-now flow', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = TestBed.runInInjectionContext(() => new LicenseSelectorComponent());
    component.spec = { id: 's1', title: 'Song' } as any;
    const license = { id: 'l1', name: 'Basic' } as any;

    component.addToCart(license);
    expect(addItem).toHaveBeenCalledWith(component.spec, license);
    expect(show).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();

    const stopPropagation = vi.fn();
    component.buyNow(license, { stopPropagation } as any);
    expect(stopPropagation).toHaveBeenCalled();
    expect(initiatePayment).toHaveBeenCalledWith('s1', 'l1', 'Song');

    initiatePayment.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.buyNow(license, { stopPropagation } as any);
    expect(logSpy).toHaveBeenCalled();
  });
});
