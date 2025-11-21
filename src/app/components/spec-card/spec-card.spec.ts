import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SpecCard } from './spec-card';

describe('SpecCard', () => {
  let component: SpecCard;
  let fixture: ComponentFixture<SpecCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SpecCard],
    }).compileComponents();

    fixture = TestBed.createComponent(SpecCard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
