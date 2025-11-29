import { type ComponentFixture, TestBed } from '@angular/core/testing';

import { LabSection } from './lab-section';

describe('LabSection', () => {
  let component: LabSection;
  let fixture: ComponentFixture<LabSection>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabSection],
    }).compileComponents();

    fixture = TestBed.createComponent(LabSection);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
