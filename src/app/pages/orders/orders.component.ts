import { CommonModule, CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ProducerOrderDto, ProducerOrderResponse } from '../../core/api/payment.requests';
import { CsvExportService } from '../../core/services/csv-export.service';
import { PaymentService } from '../../services/payment.service';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, DatePipe, PaginationComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.scss',
})
export class OrdersComponent {
  private paymentService = inject(PaymentService);
  private csvService = inject(CsvExportService);

  orders = signal<ProducerOrderDto[]>([]);
  total = signal(0);
  limit = signal(20);
  offset = signal(0);
  currentPage = signal(1);
  isLoading = signal(true);
  error = signal<string | null>(null);

  constructor() {
    this.loadOrders();
  }

  loadOrders(page: number = 1) {
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPage.set(page);

    this.paymentService.getProducerOrders(page).subscribe({
      next: (res: ProducerOrderResponse) => {
        this.orders.set(res.orders);
        this.total.set(res.total);
        this.limit.set(res.limit);
        this.offset.set(res.offset);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Failed to load orders', err);
        this.error.set('Failed to load orders. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.loadOrders(page);
  }

  exportCSV() {
    const data = this.orders().map((order) => ({
      'Order ID': order.id,
      Date: new Date(order.created_at).toLocaleDateString(),
      'Buyer Name': order.buyer_name,
      'Buyer Email': order.buyer_email,
      Item: order.spec_title,
      License: order.license_type,
      Amount: order.amount,
      Status: order.status,
    }));

    this.csvService.downloadCsv(data, `orders_export_${new Date().toISOString().split('T')[0]}`);
  }
}
