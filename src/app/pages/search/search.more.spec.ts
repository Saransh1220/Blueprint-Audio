import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';
import { SearchPageComponent } from './search.component';

describe('SearchPageComponent (more)', () => {
  const navigate = vi.fn();
  const getSpecs = vi.fn();
  const show = vi.fn();
  let pagination: ReturnType<typeof signal<any>>;
  let queryParams$: BehaviorSubject<Record<string, string>>;

  const spec = (id: string) => ({ id, title: id }) as any;

  function create(user: unknown = null) {
    pagination = signal<any>(null);
    queryParams$ = new BehaviorSubject<Record<string, string>>({});
    TestBed.configureTestingModule({
      providers: [
        { provide: LabService, useValue: { getSpecs, specsPagination: pagination } },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$ } },
        { provide: ToastService, useValue: { show } },
        { provide: AuthService, useValue: { currentUser: signal(user) } },
      ],
    });
    return TestBed.runInInjectionContext(() => new SearchPageComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of([]));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  it('uses defaults when query params are empty and tears down', () => {
    const c = create();
    c.ngOnInit();
    expect(document.body.classList.contains('search-page-active')).toBe(true);
    expect(c.searchTerm()).toBe('');
    expect(c.genre()).toEqual([]);
    expect(c.bpmRange()).toEqual([60, 200]);
    expect(c.priceRange()).toEqual([0, 50000]);
    expect(c.key()).toBe('All');
    expect(c.sortOption()).toBe('newest');
    expect(c.currentPage()).toBe(1);
    expect(c.keyMode()).toBe('any');

    c.ngOnDestroy();
    expect(document.body.classList.contains('search-page-active')).toBe(false);
    getSpecs.mockClear();
    queryParams$.next({ search: 'x' });
    expect(getSpecs).not.toHaveBeenCalled();
  });

  it('reads sort, major key and minor key params', () => {
    const c = create();
    c.ngOnInit();
    queryParams$.next({ sort: 'price_asc', key: 'C MAJOR', search: '' });
    expect(c.sortOption()).toBe('price_asc');
    expect(c.keyMode()).toBe('major');
    expect(c.searchTerm()).toBe('');
    queryParams$.next({ key: 'A MINOR' });
    expect(c.keyMode()).toBe('minor');
    queryParams$.next({ key: 'WEIRD' });
    expect(c.keyMode()).toBe('minor');
    c.ngOnDestroy();
  });

  it('throttles scroll via rAF and loads the next page near bottom', () => {
    const c = create();
    pagination.set({ total: 50, per_page: 10, page: 1 });
    c.specs.set([spec('a')]);
    c.isLoading.set(false);
    const rafCbs: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCbs.push(cb);
      return rafCbs.length;
    });
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);
    c.ngOnInit();
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));
    expect(rafCbs).toHaveLength(1);

    // not near bottom: nothing loads
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(100000);
    getSpecs.mockClear();
    rafCbs[0](0);
    expect(getSpecs).not.toHaveBeenCalled();

    // near bottom: loads
    vi.spyOn(document.documentElement, 'scrollHeight', 'get').mockReturnValue(10);
    window.dispatchEvent(new Event('scroll'));
    rafCbs[1](0);
    expect(getSpecs).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }));

    // destroy with pending frame cancels it
    window.dispatchEvent(new Event('scroll'));
    c.ngOnDestroy();
    expect(cancel).toHaveBeenCalled();
  });

  it('onWindowScroll bails out without a viewport', () => {
    const c = create();
    const doc = (c as any).document;
    vi.spyOn(doc, 'defaultView', 'get').mockReturnValue(null);
    expect(() => c.onWindowScroll()).not.toThrow();
    (c as any).passiveScrollListener();
    expect(getSpecs).not.toHaveBeenCalled();
  });

  it('ngOnInit tolerates a missing viewport', () => {
    const c = create();
    vi.spyOn((c as any).document, 'defaultView', 'get').mockReturnValue(null);
    expect(() => c.ngOnInit()).not.toThrow();
    expect(() => c.ngOnDestroy()).not.toThrow();
  });

  it('ignores stale fetch responses (success and error)', () => {
    const c = create();
    const first = new Subject<any[]>();
    const second = new Subject<any[]>();
    getSpecs.mockReturnValueOnce(first).mockReturnValueOnce(second);
    c.fetchSpecs();
    c.fetchSpecs();
    first.next([spec('stale')]);
    expect(c.specs()).toEqual([]);
    first.error(new Error('old'));
    expect(show).not.toHaveBeenCalled();
    second.next([spec('fresh')]);
    expect(c.specs().map((s) => s.id)).toEqual(['fresh']);
    expect(c.isLoading()).toBe(false);
  });

  it('scrolls to top after updatePage and resets flag on error', () => {
    const c = create();
    c.updatePage(2);
    expect(navigate).toHaveBeenCalledWith([], expect.objectContaining({ queryParams: { page: 2 } }));
    c.fetchSpecs();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    (window.scrollTo as any).mockClear();
    c.fetchSpecs();
    expect(window.scrollTo).not.toHaveBeenCalled();

    c.updatePage(3);
    getSpecs.mockReturnValueOnce(throwError(() => new Error('x')));
    c.fetchSpecs();
    expect(show).toHaveBeenCalled();
    c.fetchSpecs();
    expect(window.scrollTo).not.toHaveBeenCalled();
  });

  it('append mode flags loading-more and handles errors', () => {
    const c = create();
    const s = new Subject<any[]>();
    getSpecs.mockReturnValueOnce(s);
    c.fetchSpecs({ append: true });
    expect(c.isLoadingMore()).toBe(true);
    s.error(new Error('x'));
    expect(c.isLoadingMore()).toBe(false);
    expect(c.isLoading()).toBe(false);
  });

  it('computes pagination helpers', () => {
    const c = create();
    expect(c.resultCount()).toBe(0);
    expect(c.totalPages()).toBe(1);
    expect(c.hasMoreResults()).toBe(false);
    c.specs.set([spec('a')]);
    expect(c.resultCount()).toBe(1);

    pagination.set({ total: 25, per_page: 10 });
    expect(c.resultCount()).toBe(25);
    expect(c.totalPages()).toBe(3);
    expect(c.hasMoreResults()).toBe(true);
    pagination.set({ total: 25, per_page: 10, total_pages: 5 });
    expect(c.totalPages()).toBe(5);
    pagination.set({ total: 0, per_page: 10 });
    expect(c.totalPages()).toBe(1);
    pagination.set({ total: 1, per_page: 10 });
    expect(c.hasMoreResults()).toBe(false);
  });

  it('loadNextPage is a no-op while loading or when nothing more', () => {
    const c = create();
    pagination.set({ total: 50, per_page: 10 });
    c.isLoading.set(true);
    c.loadNextPage();
    c.isLoading.set(false);
    c.isLoadingMore.set(true);
    c.loadNextPage();
    c.isLoadingMore.set(false);
    pagination.set(null);
    c.loadNextPage();
    expect(getSpecs).not.toHaveBeenCalled();
    expect(c.currentPage()).toBe(1);
  });

  it('computes slider fills', () => {
    const c = create();
    c.bpmRange.set([60, 200]);
    expect(c.bpmFillLeft()).toBe(0);
    expect(c.bpmFillWidth()).toBe(100);
    c.priceRange.set([25000, 50000]);
    expect(c.priceFillLeft()).toBe(50);
    expect(c.priceFillWidth()).toBe(50);
  });

  it('applyFilters builds query params for non-default values only', () => {
    const c = create();
    c.sortOption.set('');
    c.applyFilters();
    expect(navigate).toHaveBeenLastCalledWith([], {
      relativeTo: expect.anything(),
      queryParams: { page: 1 },
    });

    c.searchTerm.set('  hi ');
    c.genre.set(['TRAP', 'DRILL']);
    c.bpmRange.set([70, 190]);
    c.priceRange.set([5, 400]);
    c.key.set('A MINOR');
    c.sortOption.set('name');
    c.applyFilters();
    expect(navigate.mock.lastCall![1].queryParams).toEqual({
      search: 'hi',
      genres: 'TRAP,DRILL',
      min_bpm: 70,
      max_bpm: 190,
      min_price: 5,
      max_price: 400,
      key: 'A MINOR',
      sort: 'name',
      page: 1,
    });
  });

  it('adds genre, sets key modes and keeps matching keys', () => {
    const c = create();
    c.toggleGenre('TRAP');
    expect(c.genre()).toEqual(['TRAP']);
    c.setKey('C MAJOR');
    expect(c.keyMode()).toBe('major');
    c.setKeyMode('major');
    expect(c.key()).toBe('C MAJOR');
    c.setKey('A MINOR');
    c.setKeyMode('minor');
    expect(c.key()).toBe('A MINOR');
    c.setKeyMode('any');
    expect(c.keyMode()).toBe('any');
    expect(c.visibleKeys()).toEqual(c.keys);
    c.setKeyMode('major');
    expect(c.visibleKeys().every((k) => k === 'All' || k.includes('MAJOR'))).toBe(true);
    c.setKey('All');
    expect(c.keyMode()).toBe('any');
    c.setKeyMode('major');
    expect(c.key()).toBe('All');
  });

  it('updates ranges at index 1 and clamps crossed values', () => {
    const c = create();
    c.bpmRange.set([100, 120]);
    c.updateBpm({ target: { value: '90' } } as any, 1);
    expect(c.bpmRange()).toEqual([90, 90]);
    c.updateBpm({ target: { value: '80' } } as any, 0);
    expect(c.bpmRange()).toEqual([80, 90]);
    c.priceRange.set([100, 200]);
    c.updatePrice({ target: { value: '300' } } as any, 0);
    expect(c.priceRange()).toEqual([300, 300]);
  });

  it('handles search input debounce, dedupe and onSearch', () => {
    vi.useFakeTimers();
    const c = create();
    c.ngOnInit();
    navigate.mockClear();
    c.onSearchInput('a');
    c.onSearchInput('ab');
    vi.advanceTimersByTime(401);
    expect(c.searchTerm()).toBe('ab');
    expect(navigate).toHaveBeenCalledTimes(1);
    c.onSearchInput('ab');
    vi.advanceTimersByTime(401);
    expect(navigate).toHaveBeenCalledTimes(1);
    c.onSearch();
    expect(navigate).toHaveBeenCalledTimes(2);
    c.ngOnDestroy();
  });

  it('summaries, labels and currency', () => {
    const c = create({ store_currency: 'EUR' });
    expect(c.getGenreSummary()).toBe('Any');
    c.genre.set(['TRAP']);
    expect(c.getGenreSummary()).toBe('TRAP');
    expect(c.getPriceSummary()).toBe('Any');
    c.priceRange.set([0, 100]);
    expect(c.getPriceSummary()).toContain(' - ');
    expect(c.getCurrencyCode()).toBe('EUR');
    c.sortOption.set('name');
    expect(c.getSortLabel()).toBe('Name A-Z');
    c.sortOption.set('unknown');
    expect(c.getSortLabel()).toBe('Newest');
  });

  it('defaults currency to USD without a user', () => {
    expect(create().getCurrencyCode()).toBe('USD');
  });

  it('toggles panels with and without force and closes on outside click', () => {
    const c = create();
    c.toggleMobileFilters();
    expect(c.mobileFiltersOpen()).toBe(true);
    c.toggleMobileFilters(false);
    expect(c.mobileFiltersOpen()).toBe(false);
    c.toggleMobileFilterPanel();
    expect(c.mobileFilterPanelOpen()).toBe(true);
    c.toggleMobileFilterPanel(false);
    expect(c.mobileFilterPanelOpen()).toBe(false);

    c.toggleDropdown('mood');
    c.toggleDropdown('bpm');
    expect(c.openDropdown()).toBe('bpm');

    const inside = document.createElement('div');
    inside.className = 'filter-dd';
    const btn = document.createElement('button');
    inside.appendChild(btn);
    c.onDocumentClick({ target: btn } as any);
    expect(c.openDropdown()).toBe('bpm');
    const sort = document.createElement('div');
    sort.className = 'sort-dd';
    c.onDocumentClick({ target: sort } as any);
    expect(c.openDropdown()).toBe('bpm');
    c.onDocumentClick({ target: null } as any);
    expect(c.openDropdown()).toBeNull();
  });

  it('removeActiveChip ignores unknown ids but still applies filters', () => {
    const c = create();
    c.genre.set(['TRAP']);
    c.removeActiveChip('unknown');
    expect(c.genre()).toEqual(['TRAP']);
    expect(navigate).toHaveBeenCalled();
  });

  it('chips omit defaults', () => {
    const c = create();
    expect(c.activeFilterChips()).toEqual([]);
    c.bpmRange.set([60, 150]);
    c.priceRange.set([0, 100]);
    expect(c.activeFilterChips().map((x) => x.id)).toEqual(['bpm', 'price']);
  });
});
