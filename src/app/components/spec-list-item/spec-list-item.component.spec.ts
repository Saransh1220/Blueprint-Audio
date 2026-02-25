import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SpecActionService } from '../../services/spec-action.service';
import { SpecListItemComponent } from './spec-list-item.component';
import { Role } from '../../models';

describe('SpecListItemComponent', () => {
  let fixture: ComponentFixture<SpecListItemComponent>;
  let component: SpecListItemComponent;

  const actionService = {
    isCurrentlyPlaying: vi.fn(() => false),
    syncFavorite: vi.fn(() => of(null).subscribe()),
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
    fixture.componentRef.setInput('spec', spec);
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
  });
});
