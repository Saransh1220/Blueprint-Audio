import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService, LabService } from '../../../services';
import { StudioTracksComponent } from './studio-tracks.component';

describe('StudioTracksComponent', () => {
  const getSpecs = vi.fn();
  const currentUser = signal<any>({ id: 'u1', display_name: 'Blaze' });
  const specs = [
    {
      id: 's1',
      title: 'First',
      price: 1499,
      bpm: 120,
      key: 'Cm',
      imageUrl: 'one.png',
      genres: [{ name: 'Trap' }],
      analytics: { playCount: 30, favoriteCount: 9 },
      processingStatus: 'ready',
    },
    {
      id: 's2',
      title: 'Second',
      price: undefined,
      bpm: 140,
      key: 'Dm',
      imageUrl: 'two.png',
      genres: [{ name: 'Boom Bap' }],
      analytics: { playCount: 5, favoriteCount: 2 },
    },
    {
      id: 's3',
      title: 'Alpha',
      price: 3000,
      key: 'Gm',
      genres: [],
      analytics: { playCount: 10, favoriteCount: 3 },
      processingStatus: 'pending',
    },
  ] as any;
  const specsPagination = signal<any>({ total: 36 });

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: LabService, useValue: { getSpecs, specsPagination } },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });

    return TestBed.runInInjectionContext(() => new StudioTracksComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of(specs));
  });

  it('loads the producer catalog on construction', () => {
    const component = create();

    expect(getSpecs).toHaveBeenCalledWith({
      category: 'beat',
      page: 1,
      per_page: 12,
      sort: 'newest',
    });
    expect(component.tracks()).toEqual(specs);
    expect(component.trackCount()).toBe(36);
    expect(component.isLoading()).toBe(false);
    expect(component.viewMode()).toBe('grid');
  });

  it('handles load errors and toggles between grid and list views', () => {
    getSpecs.mockReturnValueOnce(throwError(() => new Error('fail')));
    const component = create();

    expect(component.tracks()).toEqual([]);
    expect(component.trackCount()).toBe(36);
    expect(component.isLoading()).toBe(false);

    component.setView('list');
    expect(component.viewMode()).toBe('list');
    component.setView('grid');
    expect(component.viewMode()).toBe('grid');
  });

  it('filters, sorts, paginates, and selects tracks', () => {
    const component = create();

    expect(component.liveCount()).toBe(2);
    expect(component.draftCount()).toBe(1);
    expect(component.totalPages()).toBe(3);
    expect(component.pageStart()).toBe(1);
    expect(component.pageEnd()).toBe(12);

    component.setFilter('drafts');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s2']);
    component.setFilter('live');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s1', 's3']);
    component.setFilter('sold');
    expect(component.filteredTracks()).toEqual([]);
    component.setFilter('all');

    component.searchTerm.set('cm');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s1']);
    component.searchTerm.set('');
    component.genreFilter.set('boom');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s2']);
    component.genreFilter.set('');

    component.sortMode.set('plays');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s1', 's3', 's2']);
    component.sortMode.set('revenue');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s1', 's3', 's2']);
    component.sortMode.set('alpha');
    expect(component.filteredTracks().map((track) => track.id)).toEqual(['s3', 's1', 's2']);

    component.toggleSelect('s1');
    expect(component.selectedCount()).toBe(1);
    component.toggleSelect('s1');
    expect(component.selectedCount()).toBe(0);

    component.nextPage();
    expect(component.currentPage()).toBe(2);
    component.previousPage();
    expect(component.currentPage()).toBe(1);
    component.previousPage();
    expect(component.currentPage()).toBe(1);
    component.goToPage(99);
    expect(component.currentPage()).toBe(3);
    component.nextPage();
    expect(component.currentPage()).toBe(3);
    component.goToPage(0);
    expect(component.currentPage()).toBe(1);
    component.goToPage(1);
    expect(getSpecs).toHaveBeenCalled();
  });

  it('builds api filters and display helpers for track rows', () => {
    const component = create();

    component.setSearch('  first  ');
    expect(getSpecs).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'first', page: 1 }),
    );

    component.setGenreFilter(' Trap ');
    expect(getSpecs).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: 'first', genres: ['Trap'], page: 1 }),
    );

    component.setSortMode('alpha');
    expect(getSpecs).toHaveBeenLastCalledWith(expect.objectContaining({ sort: 'title' }));

    expect(component.getGenreLabel(specs[0])).toBe('Trap');
    expect(component.getGenreLabel(specs[2])).toBe('Beat');
    expect(component.trackInitial({ title: '' } as any)).toBe('b');
    expect(component.getPlayCount(specs[0])).toBe(30);
    expect(component.getFavoriteCount({} as any)).toBe(0);
    expect(component.getSoldCount(specs[0])).toBe(3);
    expect(component.getEarned(specs[0])).toBe(4497);
    expect(component.getStatus(specs[1])).toBe('draft');
    expect(component.getStatus(specs[2])).toBe('review');
    expect(component.getStatus(specs[0])).toBe('live');
    expect(component.releaseMeta(specs[1])).toContain('Draft');
    expect(component.releaseMeta(specs[2])).toContain('awaiting review');
    expect(component.releaseMeta(specs[0])).toContain('trap');
    expect(component.currency(0)).toBe('—');
    expect(component.currency(1499)).toBe('$1,499');
  });
});
