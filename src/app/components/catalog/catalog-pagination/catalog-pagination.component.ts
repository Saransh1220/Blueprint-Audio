import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-catalog-pagination',
  imports: [],
  templateUrl: './catalog-pagination.component.html',
  styleUrl: './catalog-pagination.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogPaginationComponent {
  readonly page = input.required<number>();
  readonly pageSize = input.required<number>();
  readonly totalItems = input.required<number>();
  readonly pageChange = output<number>();

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.totalItems() / this.pageSize())));
  readonly start = computed(() =>
    this.totalItems() ? (this.page() - 1) * this.pageSize() + 1 : 0,
  );
  readonly end = computed(() => Math.min(this.page() * this.pageSize(), this.totalItems()));
  readonly pages = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  selectPage(page: number) {
    if (page < 1 || page > this.totalPages() || page === this.page()) return;
    this.pageChange.emit(page);
  }
}
