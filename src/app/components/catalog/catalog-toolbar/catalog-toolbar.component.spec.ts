import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogToolbarComponent } from './catalog-toolbar.component';

describe('CatalogToolbarComponent', () => {
  let component: CatalogToolbarComponent;
  let fixture: ComponentFixture<CatalogToolbarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogToolbarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogToolbarComponent);
    fixture.componentRef.setInput('kind', 'loops');
    fixture.componentRef.setInput('viewMode', 'grid');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
