import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { SpecActionService } from '../../services/spec-action.service';
import { SpecListItemComponent } from './spec-list-item.component';
import { Role } from '../../models';

describe('SpecListItemComponent', () => {
  let fixture: ComponentFixture<SpecListItemComponent>;
  let component: SpecListItemComponent;
  let unsubscribe: ReturnType<typeof vi.fn>;

  const actionService = {
    isCurrentlyPlaying: vi.fn(() => false),
    syncFavorite: vi.fn(),
    playSong: vi.fn(),
    addToCart: vi.fn(),
    openDetails: vi.fn(),
    toggleFavorite: vi.fn(),
    downloadFreeMp3: vi.fn(),
    formatDuration: vi.fn(() => '1:23'),
  };

  const spec: any = {
    id: 's1',
    producerId: 'p1',
    producerName: 'name',
    type: 'beat',
    category: 'beat',
    imageUrl: 'x',
    title: 'Song',
    bpm: 100,
    key: 'A MINOR',
    tags: [],
    price: 1000,
    genres: [],
    licenses: [],
    processingStatus: 'completed',
    created_at: '2026-01-01',
    user: { role: Role.ARTIST },
  };

  beforeEach(async () => {
    unsubscribe = vi.fn();
    vi.clearAllMocks();
    actionService.syncFavorite.mockReturnValue({ unsubscribe });

    await TestBed.configureTestingModule({
      imports: [SpecListItemComponent],
      providers: [
        { provide: SpecActionService, useValue: actionService },
        provideRouter([]),
        { provide: ActivatedRoute, useValue: {} },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecListItemComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('spec', { ...spec });
    fixture.detectChanges();
  });

  it('wires actions and unsubscribes on destroy', () => {
    component.ngOnInit();
    expect(actionService.syncFavorite).toHaveBeenCalled();

    const event = new MouseEvent('click');
    component.playSong(event);
    component.addToCart(event);
    component.openDetails();
    component.toggleFavorite(event);
    component.downloadFreeMp3(event);

    expect(actionService.playSong).toHaveBeenCalled();
    expect(actionService.addToCart).toHaveBeenCalled();
    expect(actionService.openDetails).toHaveBeenCalled();
    expect(actionService.toggleFavorite).toHaveBeenCalled();
    expect(actionService.downloadFreeMp3).toHaveBeenCalled();

    expect(component.formatDuration(83)).toBe('1:23');
    component.ngOnDestroy();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it('handles row, title, and tag helpers for list appearances', () => {
    const event = new MouseEvent('click');
    const stopEvent = { stopPropagation: vi.fn() } as unknown as Event;

    component.appearance = 'market';
    component.handleRowClick(event);
    expect(actionService.playSong).toHaveBeenCalledWith(event, component.spec);

    component.appearance = 'default';
    component.handleRowClick(event);
    expect(actionService.playSong).toHaveBeenCalledWith(event, component.spec);

    component.navigateToDetails(stopEvent);
    expect(stopEvent.stopPropagation as ReturnType<typeof vi.fn>).toHaveBeenCalled();
    expect(actionService.openDetails).toHaveBeenCalledWith(component.spec);

    expect(component.getGenreLabel()).toBe('beat');
    expect(component.getMarketTags()).toEqual(['beat']);

    fixture.componentRef.setInput('spec', {
      ...spec,
      category: 'sample',
      tags: ['dark', '', 'club', 'warm'],
      genres: [{ id: 'g1', name: 'Trap' }],
    });
    fixture.detectChanges();

    expect(component.getGenreLabel()).toBe('Trap');
    expect(component.getMarketTags()).toEqual(['dark', 'club', 'warm']);
  });
});
