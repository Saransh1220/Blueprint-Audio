import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { PaymentService } from '../../../services/payment.service';
import { StudioOrdersComponent } from './studio-orders.component';

describe('StudioOrdersComponent', () => {
  const response = {
    orders: [
      {
        id: 'ord-1',
        amount: 1999,
        currency: 'INR',
        status: 'PAID',
        created_at: '2026-03-11T10:00:00.000Z',
        license_type: 'Basic',
        buyer_name: 'Sam',
        buyer_email: 'sam@test.com',
        spec_title: 'Wave Runner',
      },
    ],
    total: 1,
    limit: 10,
    offset: 0,
  };

  function setup(options?: { shouldError?: boolean }) {
    const getProducerOrders = options?.shouldError
      ? vi.fn().mockReturnValue(throwError(() => new Error('fail')))
      : vi.fn().mockReturnValue(of(response));
    const downloadCsv = vi.fn();

    TestBed.configureTestingModule({
      providers: [
        { provide: PaymentService, useValue: { getProducerOrders } },
        { provide: CsvExportService, useValue: { downloadCsv } },
      ],
    });

    return {
      component: TestBed.runInInjectionContext(() => new StudioOrdersComponent()),
      getProducerOrders,
      downloadCsv,
    };
  }

  it('loads the first page on construction and updates pagination state', () => {
    const { component, getProducerOrders } = setup();

    expect(getProducerOrders).toHaveBeenCalledWith(1, 10);
    expect(component.orders()).toEqual(response.orders);
    expect(component.total()).toBe(1);
    expect(component.limit()).toBe(10);
    expect(component.offset()).toBe(0);
    expect(component.currentPage()).toBe(1);
    expect(component.isLoading()).toBe(false);
    expect(component.error()).toBeNull();
  });

  it('handles order load failures and retries selected pages', () => {
    const { component, getProducerOrders } = setup({ shouldError: true });

    expect(component.error()).toBe('Failed to load orders. Please try again.');
    expect(component.isLoading()).toBe(false);

    getProducerOrders.mockReturnValueOnce(of(response));
    component.onPageChange(2);

    expect(getProducerOrders).toHaveBeenNthCalledWith(2, 2, 10);
    expect(component.currentPage()).toBe(2);
    expect(component.orders()).toEqual(response.orders);
    expect(component.error()).toBeNull();
  });

  it('exports mapped order rows to csv', () => {
    const { component, downloadCsv } = setup();
    const isoSpy = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2026-03-11T10:00:00.000Z');
    const localeSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('3/11/2026');

    component.exportCSV();

    expect(downloadCsv).toHaveBeenCalledWith(
      [
        {
          'Order ID': 'ord-1',
          Date: '3/11/2026',
          'Buyer Name': 'Sam',
          'Buyer Email': 'sam@test.com',
          Item: 'Wave Runner',
          License: 'Basic',
          Amount: 1999,
          Status: 'PAID',
        },
      ],
      'orders_export_2026-03-11',
    );

    isoSpy.mockRestore();
    localeSpy.mockRestore();
  });

  it('filters, paginates, and formats order data', () => {
    const { component, getProducerOrders } = setup();
    component.orders.set([
      ...response.orders,
      {
        ...response.orders[0],
        id: 'ord-2',
        amount: 301,
        status: 'completed',
        buyer_name: 'Ava',
        created_at: 'bad-date',
      },
      {
        ...response.orders[0],
        id: 'ord-3',
        amount: 0,
        status: 'processing',
        buyer_name: '',
      },
      {
        ...response.orders[0],
        id: 'ord-4',
        amount: undefined,
        status: 'refunded',
      },
    ] as any);
    component.total.set(35);

    expect(component.monthlyRevenue()).toBe('2,300');
    expect(component.avgOrderValue()).toBe('575');

    component.setOrderFilter('paid');
    expect(component.filteredOrders().map((order) => order.id)).toEqual(['ord-2']);
    component.setOrderFilter('processing');
    expect(component.filteredOrders().map((order) => order.id)).toEqual(['ord-3']);
    component.setOrderFilter('refunded');
    expect(component.filteredOrders().map((order) => order.id)).toEqual(['ord-4']);
    component.setOrderFilter('all');
    expect(component.filteredOrders().length).toBe(4);

    getProducerOrders.mockReturnValueOnce(of({ ...response, limit: 25, offset: 0 }));
    component.onPerPageChange(25);
    expect(component.limit()).toBe(25);
    expect(component.currentPage()).toBe(1);
    expect(getProducerOrders).toHaveBeenLastCalledWith(1, 25);

    expect(component.formatDate('2026-03-11T10:00:00.000Z')).toContain('Mar');
    expect(component.formatDate('not-a-date')).toBe('Invalid Date');
    expect(component.formatTime('2026-03-11T10:00:00.000Z')).toContain(':');
    expect(component.formatTime('not-a-date')).toBe('Invalid Date');
    expect(component.buyerColor('')).toBe('var(--hot)');
    expect(component.buyerColor('A')).toBe('var(--tangerine)');
  });
});
