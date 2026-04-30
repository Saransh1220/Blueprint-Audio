import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AuthService, LabService } from '../../../services';
import { StudioTracksComponent } from './studio-tracks.component';

describe('StudioTracksComponent', () => {
  const getSpecs = vi.fn();
  const currentUser = signal<any>({ id: 'u1', display_name: 'Blaze' });
  const specs = [
    { id: 's1', title: 'First', price: 1499, bpm: 120, key: 'Cm', imageUrl: 'one.png' },
    { id: 's2', title: 'Second', price: 2499, bpm: 140, key: 'Dm', imageUrl: 'two.png' },
  ] as any;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: LabService, useValue: { getSpecs } },
        { provide: AuthService, useValue: { currentUser } },
      ],
    });

    return TestBed.runInInjectionContext(() => new StudioTracksComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of(specs));
  });

  it('loads the producer catalog on construction', () => {
    const component = create();

    expect(getSpecs).toHaveBeenCalledWith({
      category: 'beat',
      page: 1,
      per_page: 12,
      sort: 'newest',
    });
    expect(component.tracks()).toEqual(specs);
    expect(component.trackCount()).toBe(2);
    expect(component.isLoading()).toBe(false);
    expect(component.viewMode()).toBe('grid');
  });

  it('handles load errors and toggles between grid and list views', () => {
    getSpecs.mockReturnValueOnce(throwError(() => new Error('fail')));
    const component = create();

    expect(component.tracks()).toEqual([]);
    expect(component.trackCount()).toBe(0);
    expect(component.isLoading()).toBe(false);

    component.setView('list');
    expect(component.viewMode()).toBe('list');
    component.setView('grid');
    expect(component.viewMode()).toBe('grid');
  });
});
