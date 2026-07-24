import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SamplePacksPageComponent } from './sample-packs-page.component';

describe('SamplePacksPageComponent', () => {
  let component: SamplePacksPageComponent;
  let fixture: ComponentFixture<SamplePacksPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SamplePacksPageComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SamplePacksPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
