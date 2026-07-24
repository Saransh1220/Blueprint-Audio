import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LOOP_TYPE_LABELS, type LoopCatalogItem } from '../../../models/catalog';
import {
  formatCatalogDuration,
  formatCatalogPrice,
  splitAccentTitle,
} from '../../../utils/catalog-format';

@Component({
  selector: 'app-loop-card',
  imports: [],
  templateUrl: './loop-card.component.html',
  styleUrl: './loop-card.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoopCardComponent {
  readonly loop = input.required<LoopCatalogItem>();
  readonly playing = input(false);
  readonly wishlisted = input(false);
  readonly playRequested = output<string>();
  readonly wishlistRequested = output<string>();
  readonly acquireRequested = output<LoopCatalogItem>();

  readonly titleParts = computed(() =>
    splitAccentTitle(this.loop().title, this.loop().titleAccent),
  );
  readonly priceLabel = computed(() => formatCatalogPrice(this.loop().price));
  readonly durationLabel = computed(() => formatCatalogDuration(this.loop().durationSeconds));
  readonly typeLabel = computed(() => LOOP_TYPE_LABELS[this.loop().loopType]);
}
