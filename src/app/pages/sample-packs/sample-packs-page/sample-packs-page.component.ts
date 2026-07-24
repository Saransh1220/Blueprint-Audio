import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { CatalogHeroComponent } from '../../../components/catalog/catalog-hero/catalog-hero.component';
import { CatalogPaginationComponent } from '../../../components/catalog/catalog-pagination/catalog-pagination.component';
import { CatalogToolbarComponent } from '../../../components/catalog/catalog-toolbar/catalog-toolbar.component';
import { SamplePackCardComponent } from '../../../components/catalog/sample-pack-card/sample-pack-card.component';
import { SamplePackListItemComponent } from '../../../components/catalog/sample-pack-list-item/sample-pack-list-item.component';
import type { CatalogSort, CatalogViewMode } from '../../../models/catalog';
import { CATALOG_REPOSITORY } from '../../../services/catalog/catalog-repository';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-sample-packs-page',
  imports: [
    CatalogHeroComponent,
    CatalogPaginationComponent,
    CatalogToolbarComponent,
    SamplePackCardComponent,
    SamplePackListItemComponent,
  ],
  templateUrl: './sample-packs-page.component.html',
  styleUrl: './sample-packs-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplePacksPageComponent {
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly catalog = inject(CATALOG_REPOSITORY);
  readonly packs = this.catalog.listSamplePacks();
  readonly pageSize = 12;
  readonly search = signal('');
  readonly sort = signal<CatalogSort>('newest');
  readonly viewMode = signal<CatalogViewMode>('grid');
  readonly page = signal(1);
  readonly filteredPacks = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    const items = term
      ? this.packs.filter((pack) =>
          [pack.title, pack.producer.handle, pack.genre, pack.packType, ...pack.moods].some(
            (value) => value.toLocaleLowerCase().includes(term),
          ),
        )
      : [...this.packs];
    return items.sort((left, right) => {
      if (this.sort() === 'popular') return right.engagement.playCount - left.engagement.playCount;
      if (this.sort() === 'downloads')
        return right.engagement.downloadCount - left.engagement.downloadCount;
      return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
    });
  });
  readonly visiblePacks = computed(() =>
    this.filteredPacks().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );

  updateSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }
  updateSort(value: string): void {
    this.sort.set(value as CatalogSort);
    this.page.set(1);
  }
  updateView(value: CatalogViewMode): void {
    this.viewMode.set(value);
  }
  updatePage(value: number): void {
    this.page.set(value);
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }
  openPack(slug: string): void {
    void this.router.navigate(['/sample-packs', slug]);
  }
  openFilter(name: string): void {
    this.toast.show(`${name} filters are ready for API wiring.`, 'info');
  }
}
