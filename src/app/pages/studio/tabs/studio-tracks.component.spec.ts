import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { AuthService, LabService, ToastService } from '../../../services';
import { SpecService } from '../../../services/spec.service';
import { SpecAdapter } from '../../../adapters/spec.adapter';
import { SpecActionService } from '../../../services/spec-action.service';
import { StudioTracksComponent } from './studio-tracks.component';

describe('Studio owned catalog', () => {
  const user = signal<any>({ id: 'producer-1' }),
    getUserSpecs = vi.fn(),
    deleteSpec = vi.fn(),
    navigate = vi.fn(),
    toastSuccess = vi.fn(),
    toastError = vi.fn(),
    refresh = new Subject<void>();
  const specs = [
    {
      id: 's1',
      title: 'First',
      price: 10,
      genres: [{ name: 'Trap' }],
      analytics: { playCount: 4 },
      processingStatus: 'completed',
    },
    {
      id: 's2',
      title: 'Second',
      price: 20,
      genres: [],
      analytics: { playCount: 8 },
      processingStatus: 'completed',
    },
  ];
  function setup() {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { currentUser: user } },
        { provide: LabService, useValue: { refresh$: refresh } },
        { provide: SpecService, useValue: { getUserSpecs, deleteSpec } },
        { provide: SpecAdapter, useValue: { adapt: (dto: any) => dto } },
        { provide: SpecActionService, useValue: { playSong: vi.fn() } },
        { provide: Router, useValue: { navigate } },
        { provide: ToastService, useValue: { success: toastSuccess, error: toastError } },
      ],
    });
    return TestBed.runInInjectionContext(() => new StudioTracksComponent());
  }
  beforeEach(() => {
    vi.clearAllMocks();
    user.set({ id: 'producer-1' });
    getUserSpecs.mockReturnValue(of({ data: specs, metadata: { total: 36 } }));
    deleteSpec.mockReturnValue(of(undefined));
  });
  it('requests the authenticated producer catalog instead of the public catalog', () => {
    const c = setup();
    expect(getUserSpecs).toHaveBeenCalledWith('producer-1', 1, 12);
    expect(c.tracks()).toEqual(specs);
    expect(c.trackCount()).toBe(36);
    expect(c.isLoading()).toBe(false);
  });
  it('uses server totals for pagination and reloads the current page after an owner action', () => {
    const c = setup();
    c.goToPage(2);
    expect(getUserSpecs).toHaveBeenLastCalledWith('producer-1', 2, 12);
    refresh.next();
    expect(getUserSpecs).toHaveBeenLastCalledWith('producer-1', 2, 12);
    c.previousPage();
    expect(c.currentPage()).toBe(1);
    c.nextPage();
    expect(c.currentPage()).toBe(2);
  });
  it('filters the loaded owned tracks and sorts by real plays', () => {
    const c = setup();
    c.setSearch('first');
    expect(c.filteredTracks().map((t) => t.id)).toEqual(['s1']);
    c.setSearch('');
    c.setSortMode('plays');
    expect(c.filteredTracks().map((t) => t.id)).toEqual(['s2', 's1']);
    c.setView('list');
    expect(c.viewMode()).toBe('list');
  });
  it('does not request a catalog without an authenticated user and recovers from failures', () => {
    user.set(null);
    const anonymous = setup();
    expect(getUserSpecs).not.toHaveBeenCalled();
    expect(anonymous.tracks()).toEqual([]);
    user.set({ id: 'producer-1' });
    getUserSpecs.mockReturnValue(throwError(() => new Error('offline')));
    anonymous.loadTracks();
    expect(anonymous.isLoading()).toBe(false);
  });
  it('navigates to studio upload with edit query param on editTrack', () => {
    const c = setup();
    const event = { stopPropagation: vi.fn() } as any;
    c.editTrack(event, specs[0] as any);
    expect(event.stopPropagation).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/studio/upload'], { queryParams: { edit: 's1' } });
  });
  it('handles confirmed deletion and reloads tracks', () => {
    const c = setup();
    c.trackPendingDelete.set(specs[0] as any);
    c.onDeleteConfirmed();
    expect(deleteSpec).toHaveBeenCalledWith('s1');
    expect(toastSuccess).toHaveBeenCalledWith('Beat deleted');
    expect(c.trackPendingDelete()).toBeNull();
  });
  it('handles deletion errors gracefully', () => {
    deleteSpec.mockReturnValue(throwError(() => new Error('failed')));
    const c = setup();
    c.trackPendingDelete.set(specs[0] as any);
    c.onDeleteConfirmed();
    expect(deleteSpec).toHaveBeenCalledWith('s1');
    expect(toastError).toHaveBeenCalledWith('Unable to delete this beat. Please try again.');
    expect(c.trackPendingDelete()).toBeNull();
  });
});
