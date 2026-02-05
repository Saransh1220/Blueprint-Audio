import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pagination-container" [class.hidden]="totalPages() <= 1">
      <div class="pagination-info">
        Showing <span>{{ startItem() }}</span> to <span>{{ endItem() }}</span> of
        <span>{{ total() }}</span> results
      </div>

      <div class="pagination-controls">
        <button
          class="pager-btn prev"
          [disabled]="currentPage() === 1"
          (click)="onPageChange(currentPage() - 1)"
          aria-label="Previous page"
        >
          <i class="fas fa-chevron-left"></i>
        </button>

        <div class="pages">
          @for (page of visiblePages(); track page) {
            @if (page === -1) {
              <span class="ellipsis">...</span>
            } @else {
              <button
                class="page-btn"
                [class.active]="page === currentPage()"
                (click)="onPageChange(page)"
              >
                {{ page }}
              </button>
            }
          }
        </div>

        <button
          class="pager-btn next"
          [disabled]="currentPage() === totalPages()"
          (click)="onPageChange(currentPage() + 1)"
          aria-label="Next page"
        >
          <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .pagination-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1.5rem;
        margin-top: 2rem;
        padding: 1.5rem 0;
        border-top: 1px solid var(--line-color);

        &.hidden {
          display: none;
        }
      }

      .pagination-info {
        font-size: 0.875rem;
        color: var(--text-color);
        opacity: 0.6;

        span {
          color: var(--text-color);
          opacity: 1;
          font-weight: 500;
        }
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .pager-btn,
      .page-btn {
        background: transparent;
        border: 1px solid var(--line-color);
        color: var(--text-color);
        opacity: 0.8;
        height: 36px;
        min-width: 36px;
        padding: 0 0.5rem;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover:not(:disabled) {
          background: var(--line-color);
          color: var(--text-color);
          opacity: 1;
          border-color: var(--text-color);
        }

        &:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        &.active {
          background: var(--brand-color);
          border-color: var(--brand-color);
          color: var(--on-brand-color);
          opacity: 1;
          box-shadow: 0 0 15px color-mix(in srgb, var(--brand-color), transparent 70%);
        }
      }

      .pages {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .ellipsis {
        color: var(--text-color);
        opacity: 0.4;
        padding: 0 0.25rem;
      }

      @media (min-width: 768px) {
        .pagination-container {
          flex-direction: row;
          justify-content: space-between;
        }
      }
    `,
  ],
})
export class PaginationComponent {
  currentPage = input.required<number>();
  total = input.required<number>();
  perPage = input.required<number>();

  pageChange = output<number>();

  totalPages = computed(() => Math.ceil(this.total() / this.perPage()));

  startItem = computed(() => (this.currentPage() - 1) * this.perPage() + 1);
  endItem = computed(() => Math.min(this.currentPage() * this.perPage(), this.total()));

  visiblePages = computed(() => {
    const total = this.totalPages();
    const current = this.currentPage();
    const pages: number[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);

      if (current > 3) {
        pages.push(-1); // Ellipsis
      }

      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (current < total - 2) {
        pages.push(-1); // Ellipsis
      }

      if (!pages.includes(total)) pages.push(total);
    }

    return pages;
  });

  onPageChange(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.pageChange.emit(page);
    }
  }
}
