import { CommonModule } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { License } from '../../../models/payment';
import { CurrencyService } from '../../../services/currency.service';
import { PaymentService } from '../../../services/payment.service';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';

interface PurchaseRow {
  id: string;
  date: string;
  year: string;
  title: string;
  producer: string;
  meta: string;
  license: string;
  format: string;
  downloads: string;
  paid: string;
  letter: string;
  artClass: string;
}

@Component({
  selector: 'app-studio-purchases',
  standalone: true,
  imports: [CommonModule, PaginationComponent],
  templateUrl: './studio-purchases.component.html',
  styleUrl: './studio-purchases.component.scss',
})
export class StudioPurchasesComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private currencyService = inject(CurrencyService);

  isLoading = signal(false);
  licenses = signal<License[]>([]);
  currentPage = signal(1);
  perPage = signal(8);
  searchQuery = signal('');
  licenseFilter = signal('All licenses');

  // Popup state
  showDownloadPopup = signal(false);
  downloadLinks = signal<{ type: string; url: string }[]>([]);
  downloadTitle = signal('');
  isDownloading = signal(false);

  // Pagination metadata from service
  pagination = this.paymentService.licensePagination;

  rows = computed(() => {
    const live = this.licenses();
    return live.map((license, index) => this.mapLicense(license, index));
  });

  totalSpent = computed(() => {
    const live = this.licenses();
    if (!live.length) return '—';

    const totals = live.reduce<Record<string, number>>((sum, item) => {
      const currency = this.currencyService.normalizeCurrency(item.currency);
      sum[currency] = (sum[currency] || 0) + (item.purchase_price || 0);
      return sum;
    }, {});

    return Object.entries(totals)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([currency, amount]) => this.currencyService.formatMinorMoney(amount, currency))
      .join(' + ');
  });

  ngOnInit() {
    this.loadPurchases();
  }

  loadPurchases(page = this.currentPage()) {
    this.isLoading.set(true);
    const filter =
      this.licenseFilter() === 'All licenses'
        ? undefined
        : this.licenseFilter().toUpperCase().replace(' ', '_');

    this.paymentService
      .fetchUserLicenses(page, this.perPage(), this.searchQuery(), filter)
      .subscribe({
        next: (licenses) => {
          this.licenses.set(licenses || []);
          this.currentPage.set(page);
          this.isLoading.set(false);
        },
        error: () => {
          this.licenses.set([]);
          this.isLoading.set(false);
        },
      });
  }

  onSearch(event: Event) {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery.set(query);
    this.currentPage.set(1);
    this.loadPurchases(1);
  }

  onFilterChange(event: Event) {
    const value = (event.target as HTMLSelectElement).value;
    this.licenseFilter.set(value);
    this.currentPage.set(1);
    this.loadPurchases(1);
  }

  onPageChange(page: number) {
    this.loadPurchases(page);
  }

  onPerPageChange(value: number) {
    this.perPage.set(value);
    this.currentPage.set(1);
    this.loadPurchases(1);
  }

  download(row: PurchaseRow, event: Event) {
    event.stopPropagation();

    this.downloadTitle.set(row.title);
    this.showDownloadPopup.set(true);
    this.isDownloading.set(true);
    this.downloadLinks.set([]);

    this.paymentService.getLicenseDownloads(row.id).subscribe({
      next: (res) => {
        const links: { type: string; url: string }[] = [];
        if (res.stems_url) links.push({ type: 'Stems (ZIP)', url: res.stems_url });
        if (res.wav_url) links.push({ type: 'WAV', url: res.wav_url });
        if (res.mp3_url) links.push({ type: 'MP3', url: res.mp3_url });

        this.downloadLinks.set(links);
        this.isDownloading.set(false);
      },
      error: (err) => {
        console.error('Failed to fetch download links', err);
        this.isDownloading.set(false);
      },
    });
  }

  closeDownloadPopup() {
    this.showDownloadPopup.set(false);
  }

  private mapLicense(license: License, index: number): PurchaseRow {
    const date = new Date(license.issued_at || license.created_at);
    const typeParts = (license.license_type || 'Premium WAV').split(/\s+/);
    const licenseName = typeParts[0] || 'Premium';
    const format = typeParts.slice(1).join(' ') || 'WAV';
    const title = license.spec_title || `Purchased Beat ${index + 1}`;
    return {
      id: license.id,
      date: date.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
      year: String(date.getFullYear()),
      title,
      producer: 'Producer',
      meta: `License key · ${license.license_key?.slice(0, 8) || 'active'}`,
      license: licenseName,
      format,
      downloads: `${license.downloads_count || 0} of unlimited`,
      paid: this.currencyService.formatMinorMoney(license.purchase_price || 0, license.currency),
      letter: title.slice(0, 1).toLowerCase(),
      artClass: `a${(index % 6) + 1}`,
    };
  }
}
