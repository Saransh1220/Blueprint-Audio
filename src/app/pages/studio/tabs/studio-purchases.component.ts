import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { PaymentService } from '../../../services/payment.service';
import { License } from '../../../models/payment';
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

  readonly fallbackRows: PurchaseRow[] = [
    this.row(
      'ref-1',
      'Apr 19',
      '2026',
      'Violet Hour',
      'Kita Sol',
      '92 BPM · Em',
      'Premium',
      'WAV',
      '3 of unlimited',
      7999,
      'v',
      'a1',
    ),
    this.row(
      'ref-2',
      'Apr 12',
      '2026',
      'Paper Moon',
      'Meridian',
      '74 BPM · F#m',
      'Basic',
      'MP3',
      '1 of 3 left',
      2499,
      'p',
      'a4',
    ),
    this.row(
      'ref-3',
      'Mar 28',
      '2026',
      'Ghostwire',
      'Rufio Ash',
      '140 BPM · Bm',
      'Unlimited',
      'Pro',
      '5 of unlimited',
      19999,
      'g',
      'a3',
    ),
    this.row(
      'ref-4',
      'Mar 15',
      '2026',
      'Iron Lullaby',
      'Rufio Ash',
      '68 BPM · Em',
      'Premium',
      'WAV',
      '2 of unlimited',
      7999,
      'i',
      'a6',
    ),
    this.row(
      'ref-5',
      'Mar 03',
      '2026',
      'Mint Smoke',
      'Meridian',
      '102 BPM · Dm',
      'Basic',
      'MP3',
      '3 of 3 used',
      3300,
      'm',
      'a2',
    ),
    this.row(
      'ref-6',
      'Feb 22',
      '2026',
      'Lavender Static',
      'Kita Sol',
      '110 BPM · F',
      'Premium',
      'WAV',
      '4 of unlimited',
      7999,
      'l',
      'a5',
    ),
    this.row(
      'ref-7',
      'Feb 14',
      '2026',
      'Copper Saints',
      'Kita Sol',
      '86 BPM · Gm',
      'Unlimited',
      'Pro',
      '7 of unlimited',
      19999,
      'c',
      'a4',
    ),
    this.row(
      'ref-8',
      'Feb 02',
      '2026',
      'Rust Belt',
      'Kita Sol',
      '88 BPM · Am',
      'Basic',
      'MP3',
      '2 of 3 left',
      2499,
      'r',
      'a6',
    ),
  ];

  rows = computed(() => {
    const live = this.licenses();
    if (!live.length && !this.searchQuery()) return this.fallbackRows;
    return live.map((license, index) => this.mapLicense(license, index));
  });

  totalSpent = computed(() => {
    const live = this.licenses();
    const total = live.length
      ? live.reduce((sum, item) => sum + (item.purchase_price || 0), 0)
      : 132400;
    return this.formatPaise(total);
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
      producer: 'Cult Beats',
      meta: `License key · ${license.license_key?.slice(0, 8) || 'active'}`,
      license: licenseName,
      format,
      downloads: `${license.downloads_count || 0} of unlimited`,
      paid: this.formatPaise(license.purchase_price || 0),
      letter: title.slice(0, 1).toLowerCase(),
      artClass: `a${(index % 6) + 1}`,
    };
  }

  private row(
    id: string,
    date: string,
    year: string,
    title: string,
    producer: string,
    meta: string,
    license: string,
    format: string,
    downloads: string,
    paid: number,
    letter: string,
    artClass: string,
  ): PurchaseRow {
    return {
      id,
      date,
      year,
      title,
      producer,
      meta,
      license,
      format,
      downloads,
      paid: this.formatPaise(paid),
      letter,
      artClass,
    };
  }

  private formatPaise(value: number) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(value / 100);
  }
}
