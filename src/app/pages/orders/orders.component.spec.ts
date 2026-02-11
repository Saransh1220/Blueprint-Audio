import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { ProducerOrderResponse } from '../../core/api/payment.requests';
import { CsvExportService } from '../../core/services/csv-export.service';
import { PaymentService } from '../../services/payment.service';
import { OrdersComponent } from './orders.component';

describe('OrdersComponent', () => {
  const mockResponse: ProducerOrderResponse = {
    orders: [
      {
        id: 'ord-1',
        amount: 1999,
        currency: 'INR',
        status: 'PAID',
        created_at: '2026-02-11T10:00:00.000Z',
        license_type: 'Basic',
        buyer_name: 'Sam',
        buyer_email: 'sam@test.com',
        spec_title: 'Wave Runner',
      },
    ],
    total: 1,
    limit: 20,
    offset: 0,
  };

  function setup(options?: { response?: ProducerOrderResponse; shouldError?: boolean }) {
    const getProducerOrders = options?.shouldError
      ? vi.fn().mockReturnValue(throwError(() => new Error('fail')))
      : vi.fn().mockReturnValue(of(options?.response ?? mockResponse));
    const downloadCsv = vi.fn();

    TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: PaymentService, useValue: { getProducerOrders } },
        { provide: CsvExportService, useValue: { downloadCsv } },
      ],
    });

    const fixture = TestBed.createComponent(OrdersComponent);
    fixture.detectChanges();

    return {
      component: fixture.componentInstance,
      getProducerOrders,
      downloadCsv,
    };
  }

  it('loads first page on init and stores response', () => {
    const { component, getProducerOrders } = setup();

    expect(getProducerOrders).toHaveBeenCalledWith(1);
    expect(component.orders()).toEqual(mockResponse.orders);
    expect(component.total()).toBe(1);
    expect(component.limit()).toBe(20);
    expect(component.offset()).toBe(0);
    expect(component.isLoading()).toBe(false);
  });

  it('sets error state when loading fails', () => {
    const { component, getProducerOrders } = setup({ shouldError: true });

    expect(getProducerOrders).toHaveBeenCalledWith(1);
    expect(component.error()).toBe('Failed to load orders. Please try again.');
    expect(component.isLoading()).toBe(false);
  });

  it('onPageChange loads selected page', () => {
    const { component, getProducerOrders } = setup();

    component.onPageChange(3);

    expect(getProducerOrders).toHaveBeenNthCalledWith(2, 3);
    expect(component.currentPage()).toBe(3);
  });

  it('exportCSV maps order fields and calls CsvExportService', () => {
    const { component, downloadCsv } = setup();
    const isoSpy = vi
      .spyOn(Date.prototype, 'toISOString')
      .mockReturnValue('2026-02-11T10:00:00.000Z');
    const localeSpy = vi.spyOn(Date.prototype, 'toLocaleDateString').mockReturnValue('2/11/2026');

    component.exportCSV();

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [data, filename] = downloadCsv.mock.calls[0] as [
      Array<Record<string, string | number>>,
      string,
    ];
    expect(data).toEqual([
      {
        'Order ID': 'ord-1',
        Date: '2/11/2026',
        'Buyer Name': 'Sam',
        'Buyer Email': 'sam@test.com',
        Item: 'Wave Runner',
        License: 'Basic',
        Amount: 1999,
        Status: 'PAID',
      },
    ]);
    expect(filename).toBe('orders_export_2026-02-11');

    isoSpy.mockRestore();
    localeSpy.mockRestore();
  });
});
