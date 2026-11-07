import '../../../test-setup';
import { signal } from '@angular/core';
import { type ComponentFixture, TestBed } from '@angular/core/testing';

import type { Spec } from '../../models';
import { PlayerService } from '../../services/player.service';
import { SpecActionService } from '../../services/spec-action.service';
import { FeaturedBeatsComponent } from './featured-beats';
import { formatPlays, specToDisc, startingPrice } from './featured-beats.utils';

const plays = (playCount: number) => ({ playCount, favoriteCount: 0, totalDownloadCount: 0 });

const spec = (id: string, extra: Partial<Spec> = {}): Spec =>
  ({
    id,
    producerId: 'p',
    producerName: 'Nova',
    type: 'beat',
    category: 'beat',
    imageUrl: `/art-${id}.webp`,
    title: `Beat ${id}`,
    bpm: 140,
    key: 'C Minor',
    tags: [],
    price: 29,
    genres: [{ id: 'g', name: 'Trap', slug: 'trap' }],
    licenses: [],
    processingStatus: 'completed',
    analytics: plays(12_400),
    ...extra,
  }) as Spec;

describe('featured beats utils', () => {
  it('formats play counts', () => {
    expect(formatPlays(spec('a', { analytics: undefined }))).toBe('0');
    expect(formatPlays(spec('a'))).toBe('12K');
    expect(formatPlays(spec('a', { analytics: plays(1_500_000) }))).toBe('1.5M');
    expect(formatPlays(spec('a', { analytics: plays(25_000_000) }))).toBe('25M');
    expect(formatPlays(spec('a', { analytics: plays(999) }))).toBe('999');
  });

  it('formats the starting price from money or the plain price', () => {
    expect(startingPrice(spec('a'))).toBe('$29');
    expect(startingPrice(spec('a', { price: 9.5 }))).toBe('$9.50');
    const money = { amount_minor: 4900, currency: 'EUR' } as unknown as Spec['displayPriceMoney'];
    expect(startingPrice(spec('a', { displayPriceMoney: money }))).toContain('49');
    expect(startingPrice(spec('a', { price: undefined as unknown as number }))).toBe('$0');
  });

  it('turns a beat into a disc', () => {
    const disc = specToDisc(spec('a'));
    expect(disc.imageUrl).toBe('/art-a.webp');
    expect(disc.credits.map((c) => c.value)).toEqual(['Nova', 'Trap', '140', 'C Minor']);
    expect(disc.stats?.map((s) => s.value)).toEqual(['12K', '$29']);
    const bare = specToDisc(spec('b', { imageUrl: '', genres: [] }));
    expect(bare.imageUrl).toBeUndefined();
    expect(bare.credits[1].value).toBe('Beat');
  });
});

describe('FeaturedBeatsComponent', () => {
  let fixture: ComponentFixture<FeaturedBeatsComponent>;
  let component: FeaturedBeatsComponent;
  let el: HTMLElement;
  const currentTrack = signal<Spec | null>(null);
  const isPlaying = signal(false);
  const player = { currentTrack, isPlaying, togglePlay: vi.fn(), showPlayer: vi.fn() };
  const actions = { openDetails: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    currentTrack.set(null);
    isPlaying.set(false);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    TestBed.configureTestingModule({
      providers: [
        { provide: PlayerService, useValue: player },
        { provide: SpecActionService, useValue: actions },
      ],
    });
    fixture = TestBed.createComponent(FeaturedBeatsComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
  });

  const load = (specs: Spec[]) => {
    fixture.componentRef.setInput('specs', specs);
    fixture.detectChanges();
  };
  const buttons = () => Array.from(el.querySelectorAll<HTMLButtonElement>('.act'));

  it('renders nothing without beats', () => {
    load([]);
    expect(el.querySelector('section')).toBeNull();
    component.open();
    component.togglePlay();
    expect(actions.openDetails).not.toHaveBeenCalled();
    expect(player.showPlayer).not.toHaveBeenCalled();
  });

  it('shows a disc per beat and plays the chosen one', () => {
    load([spec('a'), spec('b')]);
    expect(el.querySelectorAll('.dcc-slide')).toHaveLength(2);
    expect(buttons()[0].textContent).toContain('Play Beat a');
    buttons()[0].click();
    expect(player.showPlayer).toHaveBeenCalledWith(expect.objectContaining({ id: 'a' }));
  });

  it('follows the carousel and pauses the beat that is playing', () => {
    load([spec('a'), spec('b')]);
    (el.querySelector('[aria-label="Next beat"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(buttons()[0].textContent).toContain('Beat b');
    currentTrack.set(spec('b'));
    isPlaying.set(true);
    fixture.detectChanges();
    expect(buttons()[0].textContent).toContain('Pause');
    expect(el.querySelectorAll('.dcc-spin')).toHaveLength(1);
    buttons()[0].click();
    expect(player.togglePlay).toHaveBeenCalled();
    expect(player.showPlayer).not.toHaveBeenCalled();
  });

  it('opens the beat from the button and from the front disc', () => {
    load([spec('a'), spec('b')]);
    buttons()[1].click();
    expect(actions.openDetails).toHaveBeenLastCalledWith(expect.objectContaining({ id: 'a' }));
    (el.querySelector('.dcc-slide[data-active]') as HTMLButtonElement).click();
    expect(actions.openDetails).toHaveBeenCalledTimes(2);
    expect(component.activeSpec()?.id).toBe('a');
  });
});
