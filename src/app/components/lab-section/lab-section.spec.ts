import '../../../test-setup';
import { provideHttpClient } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { Router, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LabService, PlayerService } from '../../services';
import { SpecActionService } from '../../services/spec-action.service';

import { LabSectionComponent } from './lab-section';

describe('LabSectionComponent', () => {
  let component: LabSectionComponent;
  let fixture: ComponentFixture<LabSectionComponent>;
  let labService: { getSpecs: ReturnType<typeof vi.fn> };
  let playerService: { showPlayer: ReturnType<typeof vi.fn> };
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
    type: 'beat',
    category: 'beat',
    imageUrl: 'cover.jpg',
    audioUrl: 'audio.mp3',
    bpm: 120,
    key: 'A MINOR',
    tags: [],
    licenses: [],
  }));

  beforeEach(async () => {
    vi.clearAllMocks();
    labService = { getSpecs: vi.fn().mockReturnValue(of(specs)) };
    playerService = { showPlayer: vi.fn() };
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

  it('loads a featured slice and updates local controls', () => {
    expect(labService.getSpecs).toHaveBeenCalledWith({ category: 'beat', page: 1 });
    expect(component.specs()).toHaveLength(8);
    expect(component.isLoading()).toBe(false);

    component.setViewMode('list');
    component.setActiveChip('Trending');

    expect(component.viewMode()).toBe('list');
    expect(component.activeChip()).toBe('Trending');
  });

  it('navigates search intent and opens the player', () => {
    component.searchTerm.set('lofi drums');
    component.onSearch();
    component.navigateToSearch();
    component.playSong(specs[0] as any);

    expect(router.navigate).toHaveBeenNthCalledWith(1, ['/explore'], {
      queryParams: { search: 'lofi drums' },
    });
    expect(router.navigate).toHaveBeenNthCalledWith(2, ['/explore']);
    expect(playerService.showPlayer).toHaveBeenCalledWith(specs[0]);

    component.searchTerm.set('   ');
    component.onSearch();
    expect(router.navigate).toHaveBeenCalledTimes(2);
  });
});
