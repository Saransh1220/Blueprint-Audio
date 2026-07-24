import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { SAMPLE_PACK_TYPE_LABELS, type SamplePackDetail } from '../../../models/catalog';
import {
  formatCatalogFileSize,
  formatCatalogPrice,
  splitAccentTitle,
} from '../../../utils/catalog-format';

@Component({
  selector: 'app-sample-pack-hero',
  imports: [],
  templateUrl: './sample-pack-hero.component.html',
  styleUrl: './sample-pack-hero.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SamplePackHeroComponent {
  readonly pack = input.required<SamplePackDetail>();
  readonly demoPlaying = input(false);
  readonly wishlisted = input(false);
  readonly following = input(false);
  readonly demoRequested = output<void>();
  readonly wishlistRequested = output<void>();
  readonly followRequested = output<void>();
  readonly acquireRequested = output<void>();

  readonly titleParts = computed(() =>
    splitAccentTitle(this.pack().title, this.pack().titleAccent),
  );
  readonly priceLabel = computed(() => formatCatalogPrice(this.pack().price));
  readonly sizeLabel = computed(() => formatCatalogFileSize(this.pack().totalSizeBytes));
  readonly typeLabel = computed(() => SAMPLE_PACK_TYPE_LABELS[this.pack().packType]);
}
