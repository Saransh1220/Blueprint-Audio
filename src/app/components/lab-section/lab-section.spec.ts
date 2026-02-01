import '../../../test-setup';
import { provideHttpClient } from '@angular/common/http';
import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';

import { LabSectionComponent } from './lab-section';

describe('LabSectionComponent', () => {
  let component: LabSectionComponent;
  let fixture: ComponentFixture<LabSectionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LabSectionComponent],
      providers: [provideRouter([]), provideHttpClient(), provideAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(LabSectionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
