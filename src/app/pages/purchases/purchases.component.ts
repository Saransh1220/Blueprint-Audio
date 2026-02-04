import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { License, LicenseDownloadsResponse } from '../../models/payment';
import { ToastService } from '../../services/toast.service';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { PaginationComponent } from '../../shared/components/pagination/pagination.component';

@Component({
  selector: 'app-purchases',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent],
  templateUrl: './purchases.component.html',
  styleUrls: ['./purchases.component.scss'],
})
export class PurchasesComponent implements OnInit {
  private paymentService = inject(PaymentService);
  private toast = inject(ToastService);

  licenses = this.paymentService.userLicenses;
  pagination = this.paymentService.licensePagination;
  loading = signal(false);
  downloading = signal<string | null>(null); // ID of license being fetched
  currentPage = 1;

  // Filters
  searchQuery = '';
  filterType = 'ALL';
  private searchSubject = new Subject<string>();

  // Modal State
  showModal = signal(false);
  selectedDownloads = signal<LicenseDownloadsResponse | null>(null);

  ngOnInit() {
    this.refreshLicenses();

    // Debounce search
    this.searchSubject.pipe(debounceTime(500), distinctUntilChanged()).subscribe((query) => {
      this.searchQuery = query;
      this.currentPage = 1; // Reset to page 1 on search
      this.refreshLicenses();
    });
  }

  onSearch(query: string) {
    this.searchSubject.next(query);
  }

  onFilterChange() {
    this.currentPage = 1; // Reset to page 1 on filter
    this.refreshLicenses();
  }

  refreshLicenses(page?: number) {
    if (page) this.currentPage = page;
    this.loading.set(true);
    this.paymentService
      .fetchUserLicenses(this.currentPage, this.searchQuery, this.filterType)
      .subscribe({
        next: () => this.loading.set(false),
        error: () => this.loading.set(false),
      });
  }

  onPageChange(page: number) {
    this.refreshLicenses(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  clearFilters() {
    this.searchQuery = '';
    this.filterType = 'ALL';
    this.onSearch('');
  }

  openDownloadModal(license: License) {
    this.downloading.set(license.id);
    this.paymentService.getLicenseDownloads(license.id).subscribe({
      next: (response) => {
        this.downloading.set(null);
        this.selectedDownloads.set(response);
        this.showModal.set(true);
      },
      error: (err) => {
        this.downloading.set(null);
        const msg = err.error?.error || 'Failed to get download links';
        this.toast.show(msg, 'error');
      },
    });
  }

  closeModal() {
    this.showModal.set(false);
    this.selectedDownloads.set(null);
  }

  downloadFile(url?: string) {
    if (url) {
      window.open(url, '_blank');
    }
  }
}
