import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { LabService } from '../../services/lab';
import { AnalyticsService } from '../../services/analytics.service';
import { PlayerService } from '../../services/player.service';
import { DashboardComponent } from './dashboard.component';
import { Role } from '../../models';

describe('DashboardComponent', () => {
  const getSpecs = vi.fn();
  const getOverview = vi.fn();
  const trackPlay = vi.fn();
  const currentTrack = signal<any>(null);
  const isPlaying = signal(false);
  const togglePlay = vi.fn();
  const showPlayer = vi.fn();
  const refresh$ = new Subject<void>();

  function create(userRole = Role.PRODUCER) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal({ role: userRole }) } },
        { provide: LabService, useValue: { getSpecs, refresh$ } },
        { provide: AnalyticsService, useValue: { getOverview, trackPlay } },
        {
          provide: PlayerService,
          useValue: {
            currentTrack,
            isPlaying,
            togglePlay,
            showPlayer,
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => new DashboardComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    currentTrack.set(null);
    isPlaying.set(false);
    getSpecs.mockReturnValue(of([{ id: 's1' }]));
    trackPlay.mockReturnValue(of({}));
    getOverview.mockReturnValue(
      of({ total_plays: 10, total_revenue: 50, total_downloads: 5, total_favorites: 2 }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads producer specs and analytics and maps dashboard rows', () => {
    const component = create();
    component.loadProducerSpecs();
    component.loadAnalytics();
    expect(getSpecs).toHaveBeenCalled();
    expect(component.producerSpecs().length).toBe(1);
    expect(component.stats()[0].value).toBe('10');

    const spec = {
      id: 's1',
      title: 'Trap Run',
      producerName: 'Blaze',
      bpm: 140,
      key: 'Am',
      price: 29,
      genres: [{ id: 'g1', name: 'Trap' }],
      analytics: { playCount: 11, totalDownloadCount: 3 },
      processingStatus: 'completed',
    } as any;

    expect(component.specToCard(spec, 0).price).toBe('$29');
    expect(component.producerSpecToDropRow(spec, 0).status).toBe('live');
    refresh$.next();
    expect(getSpecs).toHaveBeenCalled();
  });

  it('handles analytics errors with fallback stats', () => {
    getOverview.mockReturnValueOnce(throwError(() => new Error('x')));
    const component = create();
    component.loadAnalytics();
    expect(component.stats()[0].delta).toBe('Loading...');
    expect(component.analyticsLoading()).toBe(false);
  });

  it('switches roles and hides toast after the timer', () => {
    const component = create(Role.LISTENER);

    component.setRole('producer');
    expect(component.activeRole()).toBe('producer');
    expect(component.toastMessage()).toBe('Switched to producer view');
    expect(component.toastVisible()).toBe(true);

    component.setRole('listener');
    vi.advanceTimersByTime(2200);
    expect(component.toastVisible()).toBe(false);
  });

  it('plays specs, toggles the active track, and reports playing state', () => {
    const component = create();
    const event = { stopPropagation: vi.fn() } as unknown as Event;
    const spec = { id: 's1', title: 'Trap Run' } as any;

    component.playSong(event, spec);
    expect(showPlayer).toHaveBeenCalledWith(spec);
    expect(trackPlay).toHaveBeenCalledWith('s1');
    expect(event.stopPropagation).toHaveBeenCalled();

    currentTrack.set(spec);
    isPlaying.set(true);
    expect(component.isPlaying(spec)).toBe(true);

    component.playSong(event, spec);
    expect(togglePlay).toHaveBeenCalled();
  });

  it('maps analytics cards and producer rows with fallback display values', () => {
    getOverview.mockReturnValueOnce(
      of({
        total_plays: 1234,
        total_revenue: 9876,
        total_downloads: 44,
        total_favorites: 7,
        top_specs: [{ title: 'Moon Glass', plays: 2345, revenue: 321 }],
      }),
    );
    const component = create();

    component.loadAnalytics();

    expect(component.stats()[0].value).toBe('1,234');
    expect(component.stats()[1].value).toBe('$9,876');
    expect(component.totalRevenue()).toBe(9876);
    expect(component.topSpecToCard(component.topSpecs()[0], 1)).toEqual(
      expect.objectContaining({ letter: 'm', plays: '2,345', rev: '$321' }),
    );

    const bareSpec = {
      title: 'Draft',
      processingStatus: 'pending',
      genres: [],
      analytics: {},
    } as any;
    expect(component.specToCard(bareSpec, 7)).toEqual(
      expect.objectContaining({ prod: '', bpm: '', key: '', price: '' }),
    );
    expect(component.producerSpecToDropRow(bareSpec, 3)).toEqual(
      expect.objectContaining({ status: 'draft', rev: '—', plays: '—', downloads: '—' }),
    );

    expect(
      component.producerSpecToDropRow({ ...bareSpec, processingStatus: 'processing' }, 4).status,
    ).toBe('review');
  });
});
