import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of, throwError } from 'rxjs';
import { MusicalKey, type Spec } from '../../models';
import {
  AnalyticsService,
  CartService,
  LabService,
  PlayerService,
  ToastService,
} from '../../services';
import { SpecDetailsComponent } from './spec-details.component';

describe('SpecDetailsComponent', () => {
  let fixture: ComponentFixture<SpecDetailsComponent>;
  let component: SpecDetailsComponent;

  const mockSpec: Spec = {
    id: 'beat-1',
    producerId: 'p1',
    producerName: 'Test Producer',
    type: 'beat',
    category: 'beat',
    imageUrl: 'cover.jpg',
    title: 'Night Drive',
    bpm: 140,
    key: MusicalKey.C_MAJOR,
    tags: ['dark', 'club'],
    price: 25,
    genres: [{ id: 'g1', name: 'Trap', slug: 'trap' }],
    licenses: [
      {
        id: 'l2',
        type: 'Premium',
        name: 'Premium',
        price: 79,
        features: ['WAV + MP3', '10k Streams'],
        fileTypes: ['wav', 'mp3'],
      },
      {
        id: 'l1',
        type: 'Basic',
        name: 'Basic',
        price: 29,
        features: ['MP3'],
        fileTypes: ['mp3'],
      },
    ],
    analytics: {
      playCount: 12,
      favoriteCount: 3,
      totalDownloadCount: 1,
      isFavorited: false,
    },
    freeMp3Enabled: true,
  };

  const labServiceMock = {
    getSpecById: vi.fn().mockReturnValue(of(mockSpec)),
    getSpecs: vi.fn().mockReturnValue(of([])),
  };

  const analyticsServiceMock = {
    trackPlay: vi.fn().mockReturnValue(of({})),
    toggleFavorite: vi.fn().mockReturnValue(of({ is_favorited: true, total_count: 4 })),
    downloadFreeMp3: vi.fn().mockReturnValue(of({ url: 'https://example.com/mp3' })),
  };

  const cartServiceMock = {
    addItem: vi.fn(),
  };
  const playerServiceMock = {
    showPlayer: vi.fn(),
  };

  const toastServiceMock = {
    success: vi.fn(),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecDetailsComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'beat-1' })) },
        },
        { provide: LabService, useValue: labServiceMock },
        { provide: PlayerService, useValue: playerServiceMock },
        { provide: CartService, useValue: cartServiceMock },
        { provide: ToastService, useValue: toastServiceMock },
        { provide: AnalyticsService, useValue: analyticsServiceMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should select the cheapest license by default', () => {
    expect(component.selectedLicense()?.id).toBe('l1');
  });

  it('should update selected license when user selects one', () => {
    component.selectLicense(mockSpec.licenses[0]);

    expect(component.selectedLicense()?.id).toBe('l2');
  });

  it('should add selected license to cart and show toast', () => {
    component.selectLicense(mockSpec.licenses[1]);
    component.addSelectedLicenseToCart();

    expect(cartServiceMock.addItem).toHaveBeenCalledWith(mockSpec, mockSpec.licenses[1]);
    expect(toastServiceMock.success).toHaveBeenCalled();
  });

  it('should update favorite analytics after toggle', () => {
    component.toggleFavorite();

    expect(analyticsServiceMock.toggleFavorite).toHaveBeenCalledWith('beat-1');
    expect(component.spec()?.analytics?.isFavorited).toBe(true);
    expect(component.spec()?.analytics?.favoriteCount).toBe(4);
  });

  it('should fallback favorite count update when total_count is missing', () => {
    analyticsServiceMock.toggleFavorite.mockReturnValueOnce(of({ is_favorited: true }));
    const previousCount = component.spec()?.analytics?.favoriteCount ?? 0;

    component.toggleFavorite();

    expect(component.spec()?.analytics?.isFavorited).toBe(true);
    expect(component.spec()?.analytics?.favoriteCount).toBe(previousCount + 1);
  });

  it('tracks play when playing spec and handles track error', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    component.playSpec();
    expect(playerServiceMock.showPlayer).toHaveBeenCalledWith(mockSpec);
    expect(analyticsServiceMock.trackPlay).toHaveBeenCalledWith('beat-1');

    analyticsServiceMock.trackPlay.mockReturnValueOnce(throwError(() => new Error('x')));
    component.playSpec();
    expect(logSpy).toHaveBeenCalled();
  });

  it('handles unfavorite fallback branch and favorite errors', () => {
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const spec = component.spec();
    if (spec?.analytics) {
      spec.analytics.favoriteCount = 2;
      spec.analytics.isFavorited = true;
    }

    analyticsServiceMock.toggleFavorite.mockReturnValueOnce(of({ is_favorited: false }));
    component.toggleFavorite();
    expect(component.spec()?.analytics?.favoriteCount).toBe(1);

    analyticsServiceMock.toggleFavorite.mockReturnValueOnce(throwError(() => new Error('boom')));
    component.toggleFavorite();
    expect(logSpy).toHaveBeenCalled();
    expect(component.isFavoriting()).toBe(false);
  });

  it('downloads free mp3 and handles missing url / error branches', () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    const logSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    component.downloadFreeMp3();
    expect(openSpy).toHaveBeenCalledWith('https://example.com/mp3', '_blank');

    analyticsServiceMock.downloadFreeMp3.mockReturnValueOnce(of({}));
    component.downloadFreeMp3();
    expect(logSpy).toHaveBeenCalledWith('Download URL not found in response');

    analyticsServiceMock.downloadFreeMp3.mockReturnValueOnce(throwError(() => new Error('x')));
    component.downloadFreeMp3();
    expect(logSpy).toHaveBeenCalled();
  });

  it('formats duration and no-ops when no selected license/spec', () => {
    expect(component.formatDuration(125)).toBe('2:05');
    component.selectedLicense.set(null);
    component.addSelectedLicenseToCart();
    expect(cartServiceMock.addItem).toHaveBeenCalledTimes(0);
  });
});
