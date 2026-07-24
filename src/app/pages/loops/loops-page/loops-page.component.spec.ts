import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LoopsPageComponent } from './loops-page.component';

describe('LoopsPageComponent', () => {
  let component: LoopsPageComponent;
  let fixture: ComponentFixture<LoopsPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoopsPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LoopsPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
