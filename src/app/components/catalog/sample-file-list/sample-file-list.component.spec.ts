import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SampleFileListComponent } from './sample-file-list.component';
import { MOCK_SAMPLE_PACK_DETAIL } from '../../../content/catalog/catalog.mock-data';

describe('SampleFileListComponent', () => {
  let component: SampleFileListComponent;
  let fixture: ComponentFixture<SampleFileListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SampleFileListComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SampleFileListComponent);
    fixture.componentRef.setInput('files', MOCK_SAMPLE_PACK_DETAIL.files);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
