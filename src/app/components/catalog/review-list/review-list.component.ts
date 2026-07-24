import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { CatalogRatingSummary, CatalogReview } from '../../../models/catalog';

@Component({
  selector: 'app-review-list',
  imports: [],
  templateUrl: './review-list.component.html',
  styleUrl: './review-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReviewListComponent {
  readonly rating = input.required<CatalogRatingSummary>();
  readonly reviews = input.required<readonly CatalogReview[]>();
  readonly stars = [1, 2, 3, 4, 5] as const;
}
