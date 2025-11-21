import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Ticker } from './ticker';

describe('Ticker', () => {
  let component: Ticker;
  let fixture: ComponentFixture<Ticker>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Ticker],
    }).compileComponents();

    fixture = TestBed.createComponent(Ticker);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
