import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { LabService } from '../../services/lab';
import { ToastService } from '../../services/toast.service';
import { SearchPageComponent } from './search.component';

describe('SearchPageComponent', () => {
  const queryParams$ = new Subject<Record<string, string>>();
  const navigate = vi.fn();
  const getSpecs = vi.fn();
  const show = vi.fn();

  function create() {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: LabService,
          useValue: {
            getSpecs,
            specsPagination: signal(null),
          },
        },
        { provide: Router, useValue: { navigate } },
        { provide: ActivatedRoute, useValue: { queryParams: queryParams$ } },
        { provide: ToastService, useValue: { show } },
      ],
    });

    const component = TestBed.runInInjectionContext(() => new SearchPageComponent());
    return component;
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of([]));
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('reads query params and fetches specs', () => {
    const component = create();
    component.ngOnInit();

    queryParams$.next({
      search: 'drill',
      genres: 'TRAP,DRILL',
      min_bpm: '70',
      max_bpm: '150',
      min_price: '99',
      max_price: '3000',
      key: 'A MINOR',
      page: '3',
    });

    expect(component.searchTerm()).toBe('drill');
    expect(component.genre()).toEqual(['TRAP', 'DRILL']);
    expect(component.currentPage()).toBe(3);
    expect(getSpecs).toHaveBeenCalled();
  });

  it('handles fetch success and error states', () => {
    const component = create();

    component.fetchSpecs();
    expect(component.isLoading()).toBe(false);

    getSpecs.mockReturnValueOnce(throwError(() => new Error('fail')));
    component.fetchSpecs();
    expect(show).toHaveBeenCalledWith('Failed to load results. Please try again.', 'error');
    expect(component.isLoading()).toBe(false);
  });

  it('applies and updates filters', () => {
    const component = create();
    component.searchTerm.set('term');
    component.genre.set(['TRAP']);
    component.bpmRange.set([80, 140]);
    component.priceRange.set([100, 1500]);
    component.key.set('C MINOR');
    component.sortOption.set('popular');

    component.applyFilters();
    expect(navigate).toHaveBeenCalled();

    component.updatePage(4);
    expect(navigate).toHaveBeenCalled();

    component.toggleGenre('DRILL');
    expect(component.genre()).toContain('DRILL');
    component.toggleGenre('DRILL');
    expect(component.genre()).not.toContain('DRILL');

    component.setKey('All');
    expect(component.key()).toBe('All');
    component.onFilterChange();
  });

  it('updates range and search interactions', () => {
    vi.useFakeTimers();
    const component = create();
    component.ngOnInit();

    component.updateBpm({ target: { value: '95' } } as any, 0);
    component.updatePrice({ target: { value: '2200' } } as any, 1);
    expect(component.bpmRange()[0]).toBe(95);
    expect(component.priceRange()[1]).toBe(2200);

    component.onSearchInput('abc');
    vi.advanceTimersByTime(401);
    expect(navigate).toHaveBeenCalled();

    component.setSortOption('newest');
    expect(getSpecs).toHaveBeenCalled();
    component.setViewMode('grid');
    expect(component.viewMode()).toBe('grid');

    component.clearFilters();
    expect(component.searchTerm()).toBe('');
    expect(component.genre()).toEqual([]);

    component.ngOnDestroy();
    vi.useRealTimers();
  });
});
