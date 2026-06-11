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

describe('LabSectionComponent', () => {
  let component: LabSectionComponent;
  let fixture: ComponentFixture<LabSectionComponent>;
  let labService: { getSpecs: ReturnType<typeof vi.fn> };
  let playerService: {
    showPlayer: ReturnType<typeof vi.fn>;
    currentTrack: ReturnType<typeof signal>;
    isPlaying: ReturnType<typeof signal>;
  };
  let specActionService: {
    isCurrentlyPlaying: ReturnType<typeof vi.fn>;
    syncFavorite: ReturnType<typeof vi.fn>;
    playSong: ReturnType<typeof vi.fn>;
    addToCart: ReturnType<typeof vi.fn>;
    openDetails: ReturnType<typeof vi.fn>;
    toggleFavorite: ReturnType<typeof vi.fn>;
    downloadFreeMp3: ReturnType<typeof vi.fn>;
    formatDuration: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  const specs = Array.from({ length: 10 }, (_, index) => ({
    id: `spec-${index}`,
    title: `Spec ${index}`,
    producerId: `producer-${index}`,
    type: 'beat',
    category: 'beat',
    producerName: `Producer ${index}`,
    imageUrl: 'cover.jpg',
    audioUrl: 'audio.mp3',
    bpm: 120,
    key: 'A MINOR',
    tags: [],
    price: 20 + index,
    genres: [{ id: 'g1', name: index % 2 ? 'Trap' : 'R&B', slug: 'genre' }],
    licenses: [],
    processingStatus: 'completed',
    analytics: {
      playCount: index * 1000,
      favoriteCount: index * 10,
      totalDownloadCount: index,
    },
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    labService = { getSpecs: vi.fn().mockReturnValue(of(specs)) };
    playerService = { showPlayer: vi.fn(), currentTrack: signal(null), isPlaying: signal(false) };
    specActionService = {
      isCurrentlyPlaying: vi.fn().mockReturnValue(false),
      syncFavorite: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
      playSong: vi.fn(),
      addToCart: vi.fn(),
      openDetails: vi.fn(),
      toggleFavorite: vi.fn(),
      downloadFreeMp3: vi.fn(),
      formatDuration: vi.fn().mockReturnValue('0:30'),
    };

    await TestBed.configureTestingModule({
      imports: [LabSectionComponent],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideAnimations(),
        { provide: LabService, useValue: labService },
        { provide: PlayerService, useValue: playerService },
        { provide: SpecActionService, useValue: specActionService },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(LabSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads a featured slice for new releases', () => {
    expect(labService.getSpecs).toHaveBeenCalledWith({
      category: 'beat',
      page: 1,
      per_page: 7,
      sort: 'newest',
    });
    expect(component.specs()).toHaveLength(7);
    expect(component.isLoading()).toBe(false);
  });

  it('renders discovery sections without rack controls', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.release-strip')).toBeFalsy();
    expect(compiled.querySelector('.charts-section')).toBeTruthy();
    expect(compiled.querySelector('.type-beats-section')).toBeTruthy();
    expect(compiled.querySelector('.licensing-section')).toBeTruthy();

    expect(compiled.querySelector('.search-bar')).toBeFalsy();
    expect(compiled.querySelector('.chip-row')).toBeFalsy();
    expect(compiled.querySelector('.sort-select')).toBeFalsy();
    expect(compiled.querySelector('.view-switch')).toBeFalsy();
  });

  it('derives charts, type beat navigation, catalog navigation, and playback', () => {
    expect(component.topChartSpecs()[0].id).toBe('spec-6');
    expect(component.formatPlays(specs[7] as any)).toBe('7K');
    expect(component.startingPrice(specs[1] as any)).toBe('$21');

    component.navigateToTypeBeat('Kendrick Lamar');
    component.navigateToSearch();
    component.playSong(specs[0] as any);

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/explore'], {
      queryParams: { search: 'Kendrick Lamar type beat' },
    });
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/explore']);
    expect(playerService.showPlayer).toHaveBeenCalledWith(specs[0]);
  });
});
