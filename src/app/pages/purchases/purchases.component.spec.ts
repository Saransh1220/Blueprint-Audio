import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
import { PurchasesComponent } from './purchases.component';

describe('PurchasesComponent', () => {
  const fetchUserLicenses = vi.fn();
  const getLicenseDownloads = vi.fn();
  const show = vi.fn();

  function create() {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: PaymentService,
          useValue: {
            userLicenses: signal([]),
            licensePagination: signal(null),
            fetchUserLicenses,
            getLicenseDownloads,
          },
        },
        { provide: ToastService, useValue: { show } },
      ],
    });
    return TestBed.runInInjectionContext(() => new PurchasesComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    fetchUserLicenses.mockReturnValue(of([]));
    getLicenseDownloads.mockReturnValue(
      of({ license_id: 'l1', license_type: 'Basic', spec_title: 'X', expires_in: 10 }),
    );
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(window, 'open').mockImplementation(() => null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes and refreshes licenses with filters/pages', () => {
    const component = create();
    component.ngOnInit();
    expect(fetchUserLicenses).toHaveBeenCalledWith(1, '', 'ALL');

    component.onFilterChange();
    expect(fetchUserLicenses).toHaveBeenCalled();

    component.refreshLicenses(2);
    expect(fetchUserLicenses).toHaveBeenCalledWith(2, '', 'ALL');

    component.onPageChange(3);
    expect(fetchUserLicenses).toHaveBeenCalledWith(3, '', 'ALL');
  });

  it('handles search debounce and clear filters', () => {
    vi.useFakeTimers();
    const component = create();
    component.ngOnInit();

    component.onSearch('abc');
    vi.advanceTimersByTime(501);
    expect(component.searchQuery).toBe('abc');
    expect(fetchUserLicenses).toHaveBeenCalled();

    component.clearFilters();
    vi.advanceTimersByTime(501);
    expect(component.searchQuery).toBe('');
    expect(component.filterType).toBe('ALL');
    vi.useRealTimers();
  });

  it('opens/closes download modal and handles errors', () => {
    const component = create();
    const license = { id: 'lic-1' } as any;

    component.openDownloadModal(license);
    expect(getLicenseDownloads).toHaveBeenCalledWith('lic-1');
    expect(component.showModal()).toBe(true);

    component.closeModal();
    expect(component.showModal()).toBe(false);
    expect(component.selectedDownloads()).toBeNull();

    getLicenseDownloads.mockReturnValueOnce(throwError(() => ({ error: { error: 'boom' } })));
    component.openDownloadModal(license);
    expect(show).toHaveBeenCalledWith('boom', 'error');
  });

  it('downloads file only when url exists', () => {
    const component = create();
    component.downloadFile('https://example.com');
    expect(window.open).toHaveBeenCalledWith('https://example.com', '_blank');

    (window.open as any).mockClear();
    component.downloadFile(undefined);
    expect(window.open).not.toHaveBeenCalled();
  });
});
