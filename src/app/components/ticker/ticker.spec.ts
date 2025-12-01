import { TestBed } from '@angular/core/testing';

import { TickerComponent } from './ticker';

describe('TickerComponent', () => {
  let component: TickerComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TickerComponent],
    });
    component = TestBed.createComponent(TickerComponent).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
