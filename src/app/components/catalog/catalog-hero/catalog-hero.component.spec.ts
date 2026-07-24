import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CatalogHeroComponent } from './catalog-hero.component';

describe('CatalogHeroComponent', () => {
  let component: CatalogHeroComponent;
  let fixture: ComponentFixture<CatalogHeroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogHeroComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogHeroComponent);
    fixture.componentRef.setInput('kind', 'loops');
    fixture.componentRef.setInput('total', 22);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
