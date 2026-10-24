import '../../../test-setup';
import { provideHttpClient } from '@angular/common/http';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of } from 'rxjs';
import { LabService, PlayerService } from '../../services';
import { SpecActionService } from '../../services/spec-action.service';
import { LabSectionComponent } from './lab-section';

const mk = (id: string, extra: Record<string, unknown> = {}): any => ({
  id,
  title: `T ${id}`,
  producerName: 'P',
  category: 'beat',
  price: 10,
  genres: [],
  licenses: [],
  ...extra,
});

describe('LabSectionComponent (more)', () => {
  let fixture: ComponentFixture<LabSectionComponent>;
  let component: LabSectionComponent;
  let labService: { getSpecs: ReturnType<typeof vi.fn> };
  let playerService: any;

  beforeEach(async () => {
    labService = { getSpecs: vi.fn().mockReturnValue(of([mk('a')])) };
    playerService = { showPlayer: vi.fn(), currentTrack: signal(null), isPlaying: signal(false) };
    await TestBed.configureTestingModule({
      imports: [LabSectionComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideAnimations(),
        { provide: LabService, useValue: labService },
        { provide: PlayerService, useValue: playerService },
        {
          provide: SpecActionService,
          useValue: {
            isCurrentlyPlaying: vi.fn().mockReturnValue(false),
            syncFavorite: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
            playSong: vi.fn(),
            addToCart: vi.fn(),
            openDetails: vi.fn(),
            toggleFavorite: vi.fn(),
            downloadFreeMp3: vi.fn(),
            formatDuration: vi.fn().mockReturnValue('0:30'),
          },
        },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(LabSectionComponent);
    component = fixture.componentInstance;
  });

  it('uses external data and skips the fetch', () => {
    fixture.componentRef.setInput('useExternalData', true);
    fixture.componentRef.setInput('homepageLoading', true);
    fixture.detectChanges();
    expect(labService.getSpecs).not.toHaveBeenCalled();
    expect(component.isLoading()).toBe(true);

    // empty while loading is ignored
    fixture.componentRef.setInput('newReleaseSpecs', []);
    fixture.componentRef.setInput('topChartSpecsInput', []);
    fixture.componentRef.setInput('trendingSpecs', []);
    expect(component.isLoading()).toBe(true);
    expect(component.trending()).toEqual([]);

    // null ignored
    fixture.componentRef.setInput('newReleaseSpecs', null);
    fixture.componentRef.setInput('topChartSpecsInput', null);
    fixture.componentRef.setInput('trendingSpecs', null);

    fixture.componentRef.setInput('homepageLoading', false);
    expect(component.isLoading()).toBe(false);
    fixture.componentRef.setInput('newReleaseSpecs', [mk('n1')]);
    fixture.componentRef.setInput('topChartSpecsInput', [mk('t2'), mk('t1')]);
    fixture.componentRef.setInput('trendingSpecs', [mk('tr1')]);
    expect(component.specs().map((s) => s.id)).toEqual(['n1']);
    expect(component.trending().map((s) => s.id)).toEqual(['tr1']);
    // external charts keep their order
    expect(component.topChartSpecs().map((s) => s.id)).toEqual(['t2', 't1']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('.chart-row').length).toBe(2);
  });

  it('ignores external inputs when external data is disabled', () => {
    fixture.detectChanges();
    fixture.componentRef.setInput('newReleaseSpecs', [mk('x'), mk('y')]);
    fixture.componentRef.setInput('topChartSpecsInput', [mk('x')]);
    fixture.componentRef.setInput('trendingSpecs', [mk('x')]);
    expect(component.specs().map((s) => s.id)).toEqual(['a']);
    expect(component.trending()).toEqual([]);
  });

  it('loads fallback when external data is turned off after init', () => {
    fixture.componentRef.setInput('useExternalData', true);
    fixture.detectChanges();
    fixture.componentRef.setInput('useExternalData', false);
    expect(labService.getSpecs).toHaveBeenCalledTimes(1);
    // fallback already loaded: no second call
    fixture.componentRef.setInput('useExternalData', true);
    fixture.componentRef.setInput('useExternalData', false);
    expect(labService.getSpecs).toHaveBeenCalledTimes(1);
  });

  it('renders empty states', () => {
    labService.getSpecs.mockReturnValue(of([]));
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('NO RELEASES AVAILABLE.');
    expect(text).toContain('NO TRENDING BEATS YET.');
  });

  it('scrolls the rail, and ignores a missing rail', () => {
    fixture.detectChanges();
    const rail = fixture.nativeElement.querySelector('.spec-grid') as HTMLElement;
    rail.scrollBy = vi.fn();
    component.scrollReleaseRailBy(1);
    expect(rail.scrollBy).toHaveBeenCalledWith({ left: 260, behavior: 'smooth' });
    component.scrollReleaseRailBy(-1);
    expect((rail.scrollBy as any).mock.calls[1][0].left).toBe(-260);
    expect(() => component.scrollReleaseRailBy(1, '.nope')).not.toThrow();
  });

  it('computes chart state and formatting helpers', () => {
    fixture.detectChanges();
    const s = mk('p', { genres: [{ name: 'Trap' }] });
    expect(component.getPrimaryGenre(s)).toBe('Trap');
    expect(component.getPrimaryGenre(mk('q'))).toBe('beat');
    expect(component.getPrimaryGenre({ id: 'z' } as any)).toBe('Beat');

    expect(component.formatPlays(mk('a'))).toBe('0');
    expect(component.formatPlays(mk('a', { analytics: { playCount: 1_500_000 } }))).toBe('1.5M');
    expect(component.formatPlays(mk('a', { analytics: { playCount: 12_000_000 } }))).toBe('12M');
    expect(component.formatPlays(mk('a', { analytics: { playCount: 999 } }))).toBe('999');

    expect(component.startingPrice(mk('a', { price: undefined }))).toBe('$0');
    expect(component.startingPrice(mk('a', { price: 9.5 }))).toBe('$9.50');
    expect(
      component.startingPrice(
        mk('a', { displayPriceMoney: { amount_minor: 1999, currency: 'EUR' } }),
      ),
    ).toContain('19.99');
    expect(component.startingPrice(mk('a', { displayPriceMoney: { amount_minor: 0 } }))).toBe('$10');

    expect(component.chartTrend(1)).toBe('up');
    expect(component.chartTrend(2)).toBe('down');
    expect(component.chartTrend(6)).toBe('-');
  });

  it('sorts charts by score then price and reflects playing state', () => {
    fixture.detectChanges();
    component.specs.set([
      mk('low', { price: 5 }),
      mk('pricey', { price: 50 }),
      mk('hot', { analytics: { playCount: 5, favoriteCount: 1 } }),
    ]);
    expect(component.topChartSpecs().map((s) => s.id)).toEqual(['hot', 'pricey', 'low']);

    expect(component.isChartPlaying(mk('hot'))).toBe(false);
    playerService.currentTrack.set({ id: 'hot' });
    playerService.isPlaying.set(true);
    expect(component.isChartPlaying(mk('hot'))).toBe(true);
    expect(component.isChartPlaying(mk('low'))).toBe(false);
  });

  it('renders trend icons and navigates on click', () => {
    labService.getSpecs.mockReturnValue(of(Array.from({ length: 4 }, (_, i) => mk(`s${i}`))));
    fixture.detectChanges();
    const router = TestBed.inject(Router);
    const nav = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fa-arrow-up')).toBeTruthy();
    expect(el.querySelector('.fa-arrow-down')).toBeTruthy();
    (el.querySelector('.license-cta') as HTMLElement).click();
    expect(nav).toHaveBeenCalledWith(['/explore']);
    (el.querySelector('.chart-row') as HTMLElement).click();
    expect(playerService.showPlayer).toHaveBeenCalled();
  });
});
