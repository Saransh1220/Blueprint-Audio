import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { LabService } from '../../services/lab';
import { PlayerService } from '../../services/player.service';
import { SpecRowComponent } from './spec-row.component';

describe('SpecRowComponent', () => {
  const getSpecs = vi.fn();
  const showPlayer = vi.fn();

  const specs = [
    {
      id: 's1',
      title: 'A',
      tags: ['TRAP'],
      genres: [{ slug: 'trap', name: 'TRAP' }],
    },
    {
      id: 's2',
      title: 'B',
      tags: ['RNB'],
      genres: [{ slug: 'rnb', name: 'RNB' }],
    },
  ] as any;

  function create() {
    TestBed.configureTestingModule({
      providers: [
        { provide: LabService, useValue: { getSpecs } },
        { provide: PlayerService, useValue: { showPlayer, isVisible: signal(false) } },
      ],
    });
    return TestBed.runInInjectionContext(() => new SpecRowComponent());
  }

  beforeEach(() => {
    vi.clearAllMocks();
    getSpecs.mockReturnValue(of(specs));
  });

  it('uses input specs and toggles view mode', () => {
    const component = create();
    component.specsInput = [specs[0]];
    component.ngOnChanges();
    expect(component.specs().length).toBe(1);

    component.setViewMode('list');
    expect(component.viewMode()).toBe('list');
    component.playSong(specs[0]);
    expect(showPlayer).toHaveBeenCalledWith(specs[0]);
  });

  it('fetches/filter specs when no input is provided', () => {
    const component = create();
    component.type = 'beat';
    component.filterTag = 'trap';
    component.ngOnInit();

    expect(getSpecs).toHaveBeenCalledWith({ category: 'beat' });
    expect(component.specs().length).toBe(1);

    component.filterTag = '';
    component.ngOnInit();
    expect(component.specs().length).toBe(2);
  });
});
