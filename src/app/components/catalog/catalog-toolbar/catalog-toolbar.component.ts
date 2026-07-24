import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { CatalogSort, CatalogViewMode, LoopCatalogSort } from '../../../models/catalog';

@Component({
  selector: 'app-catalog-toolbar',
  imports: [],
  templateUrl: './catalog-toolbar.component.html',
  styleUrl: './catalog-toolbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogToolbarComponent {
  readonly kind = input.required<'loops' | 'sample-packs'>();
  readonly viewMode = input.required<CatalogViewMode>();
  readonly sort = input<CatalogSort | LoopCatalogSort>('newest');
  readonly activeFilterCount = input(0);
  readonly filterRequested = output<string>();
  readonly clearRequested = output<void>();
  readonly sortChange = output<CatalogSort | LoopCatalogSort>();
  readonly viewModeChange = output<CatalogViewMode>();

  readonly filters = computed(() =>
    this.kind() === 'loops'
      ? ['Genre', 'Loop type', 'BPM', 'Key', 'Mood', 'Price', 'Format']
      : ['Genre', 'Pack type', 'File count', 'Mood', 'Price', 'Format'],
  );

  onSort(event: Event) {
    this.sortChange.emit(
      (event.target as HTMLSelectElement).value as CatalogSort | LoopCatalogSort,
    );
  }
}
