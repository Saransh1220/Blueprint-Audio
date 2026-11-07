import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { AdminList, ADMIN_PAGE_SIZES } from '../admin-list';

/** Pagination for one {@link AdminList}, with the page sizes the admin UI offers. */
@Component({
  selector: 'app-admin-list-footer',
  standalone: true,
  imports: [PaginationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (list().total() > 0) {
      <app-pagination
        variant="admin"
        [currentPage]="list().page()"
        [total]="list().total()"
        [perPage]="list().perPage()"
        [showPerPage]="true"
        [perPageOptions]="pageSizes"
        (pageChange)="list().goTo($event)"
        (perPageChange)="list().setPerPage($event)"
      />
    }
  `,
})
export class AdminListFooterComponent {
  readonly list = input.required<AdminList<unknown>>();
  protected readonly pageSizes = ADMIN_PAGE_SIZES;
}
