import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SAMPLE_PACK_TYPE_LABELS, type SamplePackCatalogItem } from '../../../models/catalog';
import {
  formatCatalogFileSize,
  formatCatalogPrice,
  splitAccentTitle,
} from '../../../utils/catalog-format';

@Component({
  selector: 'app-sample-pack-card',
  imports: [],
  templateUrl: './sample-pack-card.component.html',
  styleUrl: './sample-pack-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplePackCardComponent {
  readonly pack = input.required<SamplePackCatalogItem>();
  readonly openRequested = output<string>();

  readonly titleParts = computed(() =>
    splitAccentTitle(this.pack().title, this.pack().titleAccent),
  );
  readonly priceLabel = computed(() => formatCatalogPrice(this.pack().price));
  readonly sizeLabel = computed(() => formatCatalogFileSize(this.pack().totalSizeBytes));
  readonly typeLabel = computed(() => SAMPLE_PACK_TYPE_LABELS[this.pack().packType]);
}
