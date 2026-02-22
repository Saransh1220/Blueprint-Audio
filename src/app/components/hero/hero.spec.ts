import '../../../test-setup';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { HeroComponent } from './hero';

describe('HeroComponent', () => {
  let component: HeroComponent;
  let fixture: ComponentFixture<HeroComponent>;

  beforeEach(async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 0);
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    await TestBed.configureTestingModule({
      imports: [HeroComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
