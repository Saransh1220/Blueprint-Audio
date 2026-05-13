import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PaymentService } from '../../../services/payment.service';
import { StudioPurchasesComponent } from './studio-purchases.component';

describe('StudioPurchasesComponent', () => {
  const fetchUserLicenses = vi.fn();
  const getLicenseDownloads = vi.fn();
  const licensePagination = signal({ total: 1, page: 1, per_page: 8 });

  function create() {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PaymentService,
          useValue: { fetchUserLicenses, getLicenseDownloads, licensePagination },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => new StudioPurchasesComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    fetchUserLicenses.mockReturnValue(of([]));
    getLicenseDownloads.mockReturnValue(of({ wav_url: 'wav', mp3_url: 'mp3', stems_url: 'zip' }));
  });

  it('loads fallback rows and maps live licenses', () => {
    const component = create();
    expect(component.rows().length).toBe(8);
    expect(component.totalSpent()).toContain('1,324');

    fetchUserLicenses.mockReturnValueOnce(
      of([
        {
          id: 'lic-1',
          issued_at: '2026-04-01',
          created_at: '2026-04-01',
          license_type: 'Premium WAV',
          spec_title: 'Paid Beat',
          license_key: 'ABCDEFGH1234',
          downloads_count: 2,
          purchase_price: 5000,
        },
      ]),
    );

    component.loadPurchases(2);

    expect(component.currentPage()).toBe(2);
    expect(component.rows()[0].title).toBe('Paid Beat');
    expect(component.totalSpent()).toContain('50');
  });

  it('handles filters, paging, per-page changes, errors and downloads', () => {
    const component = create();

    component.onSearch({ target: { value: 'trap' } } as unknown as Event);
    expect(component.searchQuery()).toBe('trap');
    expect(fetchUserLicenses).toHaveBeenLastCalledWith(1, 8, 'trap', undefined);

    component.onFilterChange({ target: { value: 'Premium WAV' } } as unknown as Event);
    expect(component.licenseFilter()).toBe('Premium WAV');
    expect(fetchUserLicenses).toHaveBeenLastCalledWith(1, 8, 'trap', 'PREMIUM_WAV');

    component.onPerPageChange(16);
    expect(component.perPage()).toBe(16);

    component.onPageChange(3);
    expect(component.currentPage()).toBe(3);

    fetchUserLicenses.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.loadPurchases();
    expect(component.isLoading()).toBe(false);
    expect(component.licenses()).toEqual([]);

    const stopPropagation = vi.fn();
    component.download(component.fallbackRows[0], { stopPropagation } as unknown as Event);
    expect(stopPropagation).toHaveBeenCalled();
    expect(component.showDownloadPopup()).toBe(true);
    expect(component.downloadLinks().length).toBe(3);

    component.closeDownloadPopup();
    expect(component.showDownloadPopup()).toBe(false);
  });
});
