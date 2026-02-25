import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CartComponent } from './cart.component';
import { CartService } from '../../services';

describe('CartComponent', () => {
  const removeItem = vi.fn();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: CartService,
          useValue: {
            items: signal([{ id: '1' }]),
            total: vi.fn(() => 100),
            removeItem,
          },
        },
      ],
    });
  });

  it('toggles open state, removes item, and exposes total', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const component = TestBed.runInInjectionContext(() => new CartComponent());

    expect(component.total).toBe(100);
    component.toggle();
    expect(component.isOpen()).toBe(true);
    component.removeItem('1');
    expect(removeItem).toHaveBeenCalledWith('1');
    component.checkout();
    expect(logSpy).toHaveBeenCalled();
  });
});
