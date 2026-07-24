import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { CatalogHeroComponent } from '../../../components/catalog/catalog-hero/catalog-hero.component';
import { CatalogPaginationComponent } from '../../../components/catalog/catalog-pagination/catalog-pagination.component';
import { CatalogToolbarComponent } from '../../../components/catalog/catalog-toolbar/catalog-toolbar.component';
import { LoopCardComponent } from '../../../components/catalog/loop-card/loop-card.component';
import { LoopListItemComponent } from '../../../components/catalog/loop-list-item/loop-list-item.component';
import type { CatalogViewMode, LoopCatalogItem, LoopCatalogSort } from '../../../models/catalog';
import { CATALOG_REPOSITORY } from '../../../services/catalog/catalog-repository';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-loops-page',
  imports: [
    CatalogHeroComponent,
    CatalogPaginationComponent,
    CatalogToolbarComponent,
    LoopCardComponent,
    LoopListItemComponent,
  ],
  templateUrl: './loops-page.component.html',
  styleUrl: './loops-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoopsPageComponent {
  private readonly toast = inject(ToastService);
  private readonly catalog = inject(CATALOG_REPOSITORY);
  readonly loops = this.catalog.listLoops();
  readonly pageSize = 12;
  readonly search = signal('');
  readonly sort = signal<LoopCatalogSort>('newest');
  readonly viewMode = signal<CatalogViewMode>('grid');
  readonly page = signal(1);
  readonly playingId = signal<string | null>(null);
  readonly wishlistedIds = signal<ReadonlySet<string>>(new Set());

  readonly filteredLoops = computed(() => {
    const term = this.search().trim().toLocaleLowerCase();
    const items = term
      ? this.loops.filter((loop) =>
          [loop.title, loop.producer.handle, loop.genre, loop.loopType, ...loop.moods].some(
            (value) => value.toLocaleLowerCase().includes(term),
          ),
        )
      : [...this.loops];
    return items.sort((left, right) => {
      switch (this.sort()) {
        case 'popular':
          return right.engagement.playCount - left.engagement.playCount;
        case 'downloads':
          return right.engagement.downloadCount - left.engagement.downloadCount;
        case 'bpm-asc':
          return left.bpm - right.bpm;
        case 'bpm-desc':
          return right.bpm - left.bpm;
        default:
          return Date.parse(right.publishedAt) - Date.parse(left.publishedAt);
      }
    });
  });
  readonly visibleLoops = computed(() =>
    this.filteredLoops().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );

  updateSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }
  updateSort(value: string): void {
    this.sort.set(value as LoopCatalogSort);
    this.page.set(1);
  }
  updateView(value: CatalogViewMode): void {
    this.viewMode.set(value);
  }
  updatePage(value: number): void {
    this.page.set(value);
    globalThis.scrollTo?.({ top: 0, behavior: 'smooth' });
  }
  togglePlay(id: string): void {
    this.playingId.update((current) => (current === id ? null : id));
  }
  toggleWishlist(id: string): void {
    this.wishlistedIds.update((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }
  acquire(loop: LoopCatalogItem): void {
    this.toast.show(
      loop.price.amount_minor === 0
        ? `${loop.title} is ready to download.`
        : `${loop.title} added to cart.`,
      'success',
    );
  }
  openFilter(name: string): void {
    this.toast.show(`${name} filters are ready for API wiring.`, 'info');
  }
}
