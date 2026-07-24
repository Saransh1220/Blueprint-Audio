import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { SamplePackDetailPageComponent } from './sample-pack-detail-page.component';

describe('SamplePackDetailPageComponent', () => {
  let component: SamplePackDetailPageComponent;
  let fixture: ComponentFixture<SamplePackDetailPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePackDetailPageComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SamplePackDetailPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
