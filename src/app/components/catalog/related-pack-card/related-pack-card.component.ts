import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import type { SamplePackCatalogItem } from '../../../models/catalog';
import { formatCatalogPrice, splitAccentTitle } from '../../../utils/catalog-format';

@Component({
  selector: 'app-related-pack-card',
  imports: [],
  templateUrl: './related-pack-card.component.html',
  styleUrl: './related-pack-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RelatedPackCardComponent {
  readonly pack = input.required<SamplePackCatalogItem>();
  readonly openRequested = output<string>();
  readonly titleParts = computed(() =>
    splitAccentTitle(this.pack().title, this.pack().titleAccent),
  );
  readonly priceLabel = computed(() => formatCatalogPrice(this.pack().price));
}
