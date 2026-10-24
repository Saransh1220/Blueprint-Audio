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

  it('lists filters per kind and emits sort changes', () => {
    expect(component.filters()).toContain('Loop type');
    const emitted: string[] = [];
    component.sortChange.subscribe((v) => emitted.push(v));
    component.onSort({ target: { value: 'popular' } } as unknown as Event);
    expect(emitted).toEqual(['popular']);

    fixture.componentRef.setInput('kind', 'sample-packs');
    fixture.detectChanges();
    expect(component.filters()).toContain('Pack type');
    expect(component.filters()).not.toContain('Loop type');
  });
});
