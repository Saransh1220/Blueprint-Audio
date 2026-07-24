import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SamplePackCatalogItem } from '../../../models/catalog';
import {
  formatCatalogFileSize,
  formatCatalogPrice,
  splitAccentTitle,
} from '../../../utils/catalog-format';

@Component({
  selector: 'app-sample-pack-list-item',
  imports: [],
  templateUrl: './sample-pack-list-item.component.html',
  styleUrl: './sample-pack-list-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplePackListItemComponent {
  readonly pack = input.required<SamplePackCatalogItem>();
  readonly openRequested = output<string>();
  readonly titleParts = computed(() =>
    splitAccentTitle(this.pack().title, this.pack().titleAccent),
  );
  readonly priceLabel = computed(() => formatCatalogPrice(this.pack().price));
  readonly sizeLabel = computed(() => formatCatalogFileSize(this.pack().totalSizeBytes));
}
