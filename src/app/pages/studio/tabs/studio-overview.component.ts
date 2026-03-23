import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule, DatePipe, DecimalPipe } from '@angular/common';
import { AnalyticsService } from '../../../services/analytics.service';
import { PaymentService } from '../../../services/payment.service';
import { AuthService } from '../../../services';
import { AnalyticsOverviewResponse, TopSpecStat } from '../../../core/api/analytics.requests';
import { ProducerOrderDto } from '../../../core/api/payment.requests';

@Component({
  selector: 'app-studio-overview',
  imports: [CommonModule, RouterLink, DecimalPipe, DatePipe],
  templateUrl: './studio-overview.component.html',
  styleUrl: './studio-overview.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StudioOverviewComponent {
  private analyticsService = inject(AnalyticsService);
  private paymentService = inject(PaymentService);
  private authService = inject(AuthService);

  currentUser = this.authService.currentUser;

  isLoadingAnalytics = signal(true);
  isLoadingOrders = signal(true);

  analyticsData = signal<AnalyticsOverviewResponse | null>(null);
  topSpecs = signal<TopSpecStat[]>([]);
  recentOrders = signal<ProducerOrderDto[]>([]);

  kpiCards = computed(() => {
    const d = this.analyticsData();
    return [
      {
        label: 'Total Plays',
        value: d ? d.total_plays.toLocaleString() : '—',
        icon: 'fas fa-play-circle',
        color: 'blue',
        delta: 'Lifetime',
      },
      {
        label: 'Revenue',
        value: d ? '₹' + d.total_revenue.toLocaleString() : '—',
        icon: 'fas fa-rupee-sign',
        color: 'green',
        delta: 'Lifetime',
      },
      {
        label: 'Downloads',
        value: d ? d.total_downloads.toLocaleString() : '—',
        icon: 'fas fa-download',
        color: 'purple',
        delta: 'Lifetime',
      },
      {
        label: 'Favorites',
        value: d ? d.total_favorites.toLocaleString() : '—',
        icon: 'fas fa-heart',
        color: 'red',
        delta: 'Lifetime',
      },
    ];
  });

  constructor() {
    this.loadAnalytics();
    this.loadRecentOrders();
  }

  private loadAnalytics() {
    this.isLoadingAnalytics.set(true);
    this.analyticsService.getOverview(30, 'plays').subscribe({
      next: (res) => {
        this.analyticsData.set(res);
        this.topSpecs.set(res.top_specs?.slice(0, 5) || []);
        this.isLoadingAnalytics.set(false);
      },
      error: () => {
        this.isLoadingAnalytics.set(false);
      },
    });
  }

  private loadRecentOrders() {
    this.isLoadingOrders.set(true);
    this.paymentService.getProducerOrders(1, 5).subscribe({
      next: (res) => {
        this.recentOrders.set(res.orders);
        this.isLoadingOrders.set(false);
      },
      error: () => {
        this.isLoadingOrders.set(false);
      },
    });
  }
}
