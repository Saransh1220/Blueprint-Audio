import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProducerRow } from './producer-row';

describe('ProducerRow', () => {
  let component: ProducerRow;
  let fixture: ComponentFixture<ProducerRow>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProducerRow],
    }).compileComponents();

    fixture = TestBed.createComponent(ProducerRow);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
