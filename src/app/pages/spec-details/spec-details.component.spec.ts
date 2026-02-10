import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { type Spec } from '../../models';
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
    type: 'beat',
    category: 'beat',
    imageUrl: 'cover.jpg',
    title: 'Night Drive',
    bpm: 140,
    key: 'C Major',
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
    toggleFavorite: vi.fn().mockReturnValue(of({ favorited: true, total_count: 4 })),
    downloadFreeMp3: vi.fn().mockReturnValue(of({ download_url: 'https://example.com/mp3' })),
  };

  const cartServiceMock = {
    addItem: vi.fn(),
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
        { provide: PlayerService, useValue: { showPlayer: vi.fn() } },
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
});
