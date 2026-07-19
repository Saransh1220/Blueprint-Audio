import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { SpecAdapter } from '../../adapters/spec.adapter';
import type { SpecDto } from '../../core/api/spec.requests';
import type { PublicUserResponse } from '../../core/api/user.requests';
import { CurrencyService } from '../../services/currency.service';
import { SpecActionService } from '../../services/spec-action.service';
import { SpecService } from '../../services/spec.service';
import { UserService } from '../../services/user.service';
import { ProducerProfileComponent } from './producer-profile.component';

describe('ProducerProfileComponent', () => {
  const profile: PublicUserResponse = {
    id: 'producer-1',
    name: 'Night Maker',
    display_name: 'Midnight Audio',
    role: 'producer',
    bio: 'Dark records for late nights.',
    avatar_url: 'avatar.jpg',
    banner_url: 'banner.jpg',
    instagram_url: 'https://instagram.com/midnight',
    twitter_url: 'https://x.com/midnight',
    youtube_url: 'https://youtube.com/@midnight',
    spotify_url: 'https://open.spotify.com/artist/midnight',
    store_currency: 'INR',
    created_at: '2022-01-02T03:04:05Z',
  };

  const specDtos: SpecDto[] = [
    {
      id: 'spec-1',
      producer_id: 'producer-1',
      producer_name: 'Midnight Audio',
      title: 'Night Drive',
      category: 'beat',
      type: 'Trap',
      bpm: 140,
      key: 'C Minor',
      image_url: 'cover-1.jpg',
      preview_url: 'preview-1.mp3',
      price: 25,
      created_at: '2026-01-01',
      updated_at: '2026-01-02',
      free_mp3_enabled: true,
      short_code: 'abc12345',
      genres: [{ id: 'g1', name: 'Trap', slug: 'trap' }],
      analytics: {
        play_count: 1_200,
        favorite_count: 45,
        total_download_count: 3,
      },
    },
    {
      id: 'spec-2',
      producer_id: 'producer-1',
      producer_name: 'Midnight Audio',
      title: 'Soft Focus',
      category: 'sample',
      type: 'Lo-fi',
      bpm: 90,
      key: 'A Major',
      image_url: 'cover-2.jpg',
      preview_url: 'preview-2.mp3',
      price: 10,
      created_at: '2026-01-03',
      updated_at: '2026-01-04',
      genres: [{ id: 'g2', name: 'Lo-fi', slug: 'lo-fi' }],
      analytics: {
        play_count: 300,
        favorite_count: 5,
        total_download_count: 1,
      },
    },
  ];

  const userServiceMock = { getPublicProfile: vi.fn() };
  const specServiceMock = { getUserSpecs: vi.fn() };
  const actionServiceMock = { playSong: vi.fn(), addToCart: vi.fn() };
  const currencyServiceMock = { formatMoney: vi.fn().mockReturnValue('₹25') };
  const routeMock = {
    paramMap: of(convertToParamMap({ id: 'producer-1' })),
    snapshot: { queryParamMap: convertToParamMap({ id: 'producer-1' }) },
  };

  beforeEach(async () => {
    userServiceMock.getPublicProfile.mockReturnValue(of(profile));
    specServiceMock.getUserSpecs.mockReturnValue(
      of({
        data: specDtos,
        metadata: { total: 12, page: 1, per_page: 10 },
      }),
    );

    await TestBed.configureTestingModule({
      imports: [ProducerProfileComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: routeMock },
        { provide: UserService, useValue: userServiceMock },
        { provide: SpecService, useValue: specServiceMock },
        { provide: SpecAdapter, useValue: new SpecAdapter() },
        { provide: SpecActionService, useValue: actionServiceMock },
        { provide: CurrencyService, useValue: currencyServiceMock },
      ],
    }).compileComponents();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('loads and renders the public profile catalog', () => {
    const fixture = TestBed.createComponent(ProducerProfileComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(userServiceMock.getPublicProfile).toHaveBeenCalledWith('producer-1');
    expect(specServiceMock.getUserSpecs).toHaveBeenCalledWith('producer-1', 1, 10);
    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(false);
    expect(component.displayName()).toBe('Midnight Audio');
    expect(component.initials()).toBe('M');
    expect(component.handle()).toBe('nightmaker');
    expect(component.totalSpecs()).toBe(12);
    expect(component.totalPlays()).toBe(1_500);
    expect(component.totalFavorites()).toBe(50);
    expect(component.genres()).toEqual(['All', 'Trap', 'Lo-fi']);
    expect(component.compact(1_500)).toBe('1.5K');

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Midnight Audio');
    expect(text).toContain('Night Drive');
    expect(text).toContain('Soft Focus');
  });

  it('filters genres, toggles following, and delegates track actions', () => {
    const component = TestBed.createComponent(ProducerProfileComponent).componentInstance;
    const trapSpec = component.specs()[0];
    const event = new Event('click');

    component.activeGenre.set('Trap');
    expect(component.filteredSpecs()).toEqual([trapSpec]);
    component.activeGenre.set('Missing');
    expect(component.filteredSpecs()).toEqual([]);
    component.activeGenre.set('All');
    expect(component.filteredSpecs()).toHaveLength(2);

    component.toggleFollow();
    expect(component.following()).toBe(true);
    component.toggleFollow();
    expect(component.following()).toBe(false);

    component.play(event, trapSpec);
    component.addToCart(event, trapSpec);
    expect(actionServiceMock.playSong).toHaveBeenCalledWith(event, trapSpec);
    expect(actionServiceMock.addToCart).toHaveBeenCalledWith(event, trapSpec);

    expect(component.price(trapSpec)).toBe('₹25');
    expect(currencyServiceMock.formatMoney).toHaveBeenCalledWith(
      trapSpec.displayPriceMoney,
      trapSpec.price,
      'INR',
    );

    component.profile.set({ ...profile, display_name: undefined, store_currency: undefined });
    expect(component.displayName()).toBe('Night Maker');
    expect(component.price(trapSpec)).toBe('₹25');
    expect(currencyServiceMock.formatMoney).toHaveBeenLastCalledWith(
      trapSpec.displayPriceMoney,
      trapSpec.price,
      'USD',
    );

    component.profile.set(null);
    expect(component.displayName()).toBe('Producer');
    expect(component.initials()).toBe('P');
    expect(component.handle()).toBe('producer');
  });

  it('shows the error state when either request fails', () => {
    userServiceMock.getPublicProfile.mockReturnValueOnce(throwError(() => new Error('missing')));
    const fixture = TestBed.createComponent(ProducerProfileComponent);
    const component = fixture.componentInstance;
    fixture.detectChanges();

    expect(component.loading()).toBe(false);
    expect(component.error()).toBe(true);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Producer not found.');
  });
});
