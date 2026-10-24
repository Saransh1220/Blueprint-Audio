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

  it('emits search text and switches copy by kind', () => {
    const emitted: string[] = [];
    component.searchChange.subscribe((v) => emitted.push(v));
    component.onSearch({ target: { value: 'lofi' } } as unknown as Event);
    expect(emitted).toEqual(['lofi']);
    expect(component.copy().noun).toBe('loops');

    fixture.componentRef.setInput('kind', 'sample-packs');
    fixture.detectChanges();
    expect(component.copy().noun).toBe('packs');
    expect(component.copy().accent).toBe('pack');
  });
});
