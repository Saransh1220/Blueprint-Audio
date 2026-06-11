import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ProducerOrderDto, ProducerOrderResponse } from '../../../core/api/payment.requests';
import { CsvExportService } from '../../../core/services/csv-export.service';
import { AppCurrency } from '../../../models';
import { CurrencyService } from '../../../services/currency.service';
import { PaymentService } from '../../../services/payment.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-studio-orders',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './studio-orders.component.html',
  styleUrl: './studio-orders.component.scss',
})
export class StudioOrdersComponent {
  private paymentService = inject(PaymentService);
  private csvService = inject(CsvExportService);
  private currencyService = inject(CurrencyService);

  orders = signal<ProducerOrderDto[]>([]);
  total = signal(0);
  limit = signal(10);
  offset = signal(0);
  currentPage = signal(1);
  isLoading = signal(true);
  error = signal<string | null>(null);
  orderFilter = signal<'all' | 'paid' | 'processing' | 'refunded'>('all');

  filteredOrders = computed(() => {
    const f = this.orderFilter();
    if (f === 'all') return this.orders();
    return this.orders().filter((o) => {
      if (f === 'paid') return o.status === 'paid' || o.status === 'completed';
      return o.status === f;
    });
  });

  monthlyRevenue = computed(() => {
    const orders = this.orders();
    const sums: { [currency: string]: number } = {};
    for (const o of orders) {
      const curr = o.currency || 'INR';
      sums[curr] = (sums[curr] || 0) + (o.amount || 0);
    }
    const keys = Object.keys(sums);
    if (keys.length === 0) {
      return this.currencyService.formatMoney(null, 0, 'INR');
    }
    return keys
      .map((curr) => this.currencyService.formatMoney(null, sums[curr], curr as AppCurrency))
      .join(' + ');
  });

  avgOrderValue = computed(() => {
    const orders = this.orders();
    if (!orders.length) {
      return this.currencyService.formatMoney(null, 0, 'INR');
    }
    const groups: { [currency: string]: { sum: number; count: number } } = {};
    for (const o of orders) {
      const curr = o.currency || 'INR';
      if (!groups[curr]) {
        groups[curr] = { sum: 0, count: 0 };
      }
      groups[curr].sum += o.amount || 0;
      groups[curr].count += 1;
    }
    const keys = Object.keys(groups);
    return keys
      .map((curr) => {
        const avg = groups[curr].sum / groups[curr].count;
        return this.currencyService.formatMoney(null, avg, curr as AppCurrency);
      })
      .join(' + ');
  });

  constructor() {
    this.loadOrders();
  }

  loadOrders(page: number = this.currentPage()) {
    this.isLoading.set(true);
    this.error.set(null);
    this.currentPage.set(page);

    this.paymentService.getProducerOrders(page, this.limit()).subscribe({
      next: (res: ProducerOrderResponse) => {
        this.orders.set(res.orders);
        this.total.set(res.total);
        this.limit.set(res.limit);
        this.offset.set(res.offset);
        this.isLoading.set(false);
      },
      error: () => {
        this.error.set('Failed to load orders. Please try again.');
        this.isLoading.set(false);
      },
    });
  }

  onPageChange(page: number) {
    this.loadOrders(page);
  }

  onPerPageChange(value: number) {
    this.limit.set(value);
    this.currentPage.set(1);
    this.loadOrders(1);
  }

  setOrderFilter(filter: 'all' | 'paid' | 'processing' | 'refunded') {
    this.orderFilter.set(filter);
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

  formatDate(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  }

  formatTime(dateStr: string): string {
    try {
      return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  formatOrderAmount(amount: number, currency?: string): string {
    return this.currencyService.formatMoney(
      null,
      amount,
      this.currencyService.normalizeCurrency(currency),
    );
  }

  buyerColor(name: string): string {
    const colors = [
      'var(--hot)',
      'var(--cobalt)',
      'var(--lime)',
      'var(--sun)',
      'var(--lavender)',
      'var(--tangerine)',
    ];
    const idx = (name.charCodeAt(0) || 0) % colors.length;
    return colors[idx];
  }
}
