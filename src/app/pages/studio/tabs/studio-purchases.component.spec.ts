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
          purchase_price: 12000,
          currency: 'USD',
        },
      ]),
    );

    component.loadPurchases(2);

    expect(component.currentPage()).toBe(2);
    expect(component.rows()[0].title).toBe('Paid Beat');
    expect(component.rows()[0].paid).toBe('$120');
    expect(component.totalSpent()).toBe('$120');
  });

  it('keeps mixed historical purchase totals in their transaction currencies', () => {
    const component = create();
    fetchUserLicenses.mockReturnValueOnce(
      of([
        {
          id: 'lic-usd',
          issued_at: '2026-04-01',
          created_at: '2026-04-01',
          license_type: 'Premium WAV',
          spec_title: 'USD Beat',
          license_key: 'USD12345',
          downloads_count: 0,
          purchase_price: 1099,
          currency: 'USD',
        },
        {
          id: 'lic-inr',
          issued_at: '2026-04-02',
          created_at: '2026-04-02',
          license_type: 'Basic MP3',
          spec_title: 'INR Beat',
          license_key: 'INR12345',
          downloads_count: 0,
          purchase_price: 89900,
          currency: 'INR',
        },
      ]),
    );

    component.loadPurchases(1);

    expect(component.rows()[0].paid).toBe('$10.99');
    expect(component.rows()[1].paid).toBe('₹899');
    expect(component.totalSpent()).toBe('₹899 + $10.99');
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

  it('maps licenses with missing optional fields using defaults', () => {
    const component = create();
    fetchUserLicenses.mockReturnValueOnce(
      of([{ id: 'x', created_at: '2026-01-05T12:00:00' }, { id: 'y', created_at: '2026-01-06T12:00:00', license_type: 'Unlimited' }]),
    );
    component.loadPurchases(1);
    const [first, second] = component.rows();
    expect(first.title).toBe('Purchased Beat 1');
    expect(first.license).toBe('Premium');
    expect(first.format).toBe('WAV');
    expect(first.meta).toBe('License key · active');
    expect(first.downloads).toBe('0 of unlimited');
    expect(first.letter).toBe('p');
    expect(first.year).toBe('2026');
    expect(second.license).toBe('Unlimited');
    expect(second.format).toBe('WAV');
    expect(second.artClass).toBe('a2');
    expect(component.totalSpent()).toBeTruthy();
  });

  it('treats null results as empty, shows no fallback while searching', () => {
    const component = create();
    fetchUserLicenses.mockReturnValueOnce(of(null));
    component.loadPurchases(1);
    expect(component.licenses()).toEqual([]);
    expect(component.rows().length).toBe(8);

    component.searchQuery.set('zzz');
    expect(component.rows()).toEqual([]);
  });

  it('handles download failures and partial link sets', () => {
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const component = create();
    const evt = { stopPropagation: vi.fn() } as unknown as Event;
    getLicenseDownloads.mockReturnValueOnce(throwError(() => new Error('no')));
    component.download(component.fallbackRows[0], evt);
    expect(component.isDownloading()).toBe(false);
    expect(component.downloadLinks()).toEqual([]);
    expect(errSpy).toHaveBeenCalled();

    getLicenseDownloads.mockReturnValueOnce(of({ mp3_url: 'only' }));
    component.download(component.fallbackRows[1], evt);
    expect(component.downloadTitle()).toBe('Paper Moon');
    expect(component.downloadLinks()).toEqual([{ type: 'MP3', url: 'only' }]);
    errSpy.mockRestore();
  });

  it('loads on init', () => {
    const component = create();
    component.ngOnInit();
    expect(fetchUserLicenses).toHaveBeenCalledWith(1, 8, '', undefined);
  });
});
