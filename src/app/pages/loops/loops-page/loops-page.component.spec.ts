import { TestBed } from '@angular/core/testing';
import { CATALOG_REPOSITORY } from '../../../services/catalog/catalog-repository';
import { ToastService } from '../../../services/toast.service';
import { LoopsPageComponent } from './loops-page.component';

function makeLoop(i: number, over: any = {}) {
  return {
    id: `l${i}`,
    title: `Loop ${i}`,
    titleAccent: 'Accent',
    producer: { handle: `prod${i}`, avatarFallback: 'P' },
    artwork: { palette: 'ember' },
    waveformPeaks: [0.2, 0.5],
    musicalKey: 'Am',
    durationSeconds: 8,
    genre: 'Trap',
    loopType: 'drums',
    moods: ['dark'],
    bpm: 100 + i,
    publishedAt: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    engagement: { playCount: i * 10, downloadCount: 100 - i },
    price: { amount_minor: 500, currency: 'USD' },
    ...over,
  };
}

describe('LoopsPageComponent', () => {
  const show = vi.fn();
  const loops = Array.from({ length: 15 }, (_, i) => makeLoop(i + 1));
  loops[0] = makeLoop(1, { price: { amount_minor: 0, currency: 'USD' }, genre: 'Lofi', moods: ['chill'] });

  function create() {
    TestBed.configureTestingModule({
      imports: [LoopsPageComponent],
      providers: [
        { provide: ToastService, useValue: { show } },
        { provide: CATALOG_REPOSITORY, useValue: { listLoops: () => loops } },
      ],
    });
    const fixture = TestBed.createComponent(LoopsPageComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance };
  }

  beforeEach(() => vi.clearAllMocks());

  it('should create and paginate', () => {
    const { component } = create();
    expect(component.filteredLoops().length).toBe(15);
    expect(component.visibleLoops().length).toBe(12);
    component.updatePage(2);
    expect(component.visibleLoops().length).toBe(3);
  });

  it('sorts by every mode', () => {
    const { component } = create();
    expect(component.filteredLoops()[0].id).toBe('l15');
    component.updateSort('popular');
    expect(component.filteredLoops()[0].id).toBe('l15');
    component.updateSort('downloads');
    expect(component.filteredLoops()[0].id).toBe('l1');
    component.updateSort('bpm-asc');
    expect(component.filteredLoops()[0].id).toBe('l1');
    component.updateSort('bpm-desc');
    expect(component.filteredLoops()[0].id).toBe('l15');
    expect(component.page()).toBe(1);
  });

  it('filters by search and resets page', () => {
    const { component } = create();
    component.updatePage(2);
    component.updateSearch('  LOFI ');
    expect(component.page()).toBe(1);
    expect(component.filteredLoops().map((l) => l.id)).toEqual(['l1']);
    component.updateSearch('prod3');
    expect(component.filteredLoops().map((l) => l.id)).toEqual(['l3']);
    component.updateSearch('nomatch');
    expect(component.filteredLoops()).toEqual([]);
  });

  it('handles view, play, wishlist, acquire and filters', () => {
    const { component } = create();
    component.updateView('list');
    expect(component.viewMode()).toBe('list');

    component.togglePlay('l1');
    expect(component.playingId()).toBe('l1');
    component.togglePlay('l1');
    expect(component.playingId()).toBeNull();

    component.toggleWishlist('l1');
    expect(component.wishlistedIds().has('l1')).toBe(true);
    component.toggleWishlist('l1');
    expect(component.wishlistedIds().has('l1')).toBe(false);

    component.acquire(loops[0] as any);
    expect(show).toHaveBeenCalledWith('Loop 1 is ready to download.', 'success');
    component.acquire(loops[1] as any);
    expect(show).toHaveBeenCalledWith('Loop 2 added to cart.', 'success');
    component.openFilter('Genre');
    expect(show).toHaveBeenCalledWith('Genre filters are ready for API wiring.', 'info');
  });

  it('renders list view', () => {
    const { fixture, component } = create();
    component.updateView('list');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-loop-list-item')).toBeTruthy();
  });
});
