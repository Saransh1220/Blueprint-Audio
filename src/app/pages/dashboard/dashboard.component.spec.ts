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
  const refresh$ = new Subject<void>();

  function create(userRole = Role.PRODUCER) {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: signal({ role: userRole }) } },
        { provide: LabService, useValue: { getSpecs, refresh$ } },
        { provide: AnalyticsService, useValue: { getOverview } },
        {
          provide: PlayerService,
          useValue: {
            currentTrack: signal(null),
            isPlaying: signal(false),
            togglePlay: vi.fn(),
            showPlayer: vi.fn(),
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() => new DashboardComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of([{ id: 's1' }]));
    getOverview.mockReturnValue(
      of({ total_plays: 10, total_revenue: 50, total_downloads: 5, total_favorites: 2 }),
    );
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
});
