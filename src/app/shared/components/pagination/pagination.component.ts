import { Component, input, output, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="pagination-container"
      [class.hidden]="totalPages() <= 1 && !showPerPage()"
      [class.cult-beats]="variant() === 'cult-beats'"
      [class.studio]="variant() === 'studio'"
    >
      <div class="pagination-info">
        @if (variant() === 'studio') {
          Showing <strong>{{ startItem() }}-{{ endItem() }}</strong> of <strong>{{ total() }}</strong>
        } @else {
          Showing <span>{{ startItem() }}</span> to <span>{{ endItem() }}</span> of
          <span>{{ total() }}</span> results
        }
      </div>

      <div class="pagination-controls">
        <button
          class="pager-btn prev"
          [disabled]="currentPage() === 1"
          (click)="onPageChange(currentPage() - 1)"
          aria-label="Previous page"
        >
          @if (variant() === 'studio') {
            Prev
          } @else {
            <i class="fas fa-chevron-left"></i>
          }
        </button>

        <div class="pages">
          @for (page of visiblePages(); track $index) {
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
          @if (variant() === 'studio') {
            Next
          } @else {
            <i class="fas fa-chevron-right"></i>
          }
        </button>
      </div>

      @if (showPerPage()) {
        <div class="pagination-perpage">
          <span>per page</span>
          <select (change)="onPerPageChange($event)">
            @for (opt of perPageOptions(); track opt) {
              <option [value]="opt" [selected]="opt === perPage()">{{ opt }}</option>
            }
          </select>
        </div>
      }
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

      .pagination-container.cult-beats {
        gap: 1rem;
        padding: 1.25rem 0 0;
        border-top: none;
      }

      .pagination-container.studio {
        margin-top: 20px;
        padding: 14px 18px;
        background: var(--cream);
        border: 2px solid var(--ink);
        border-radius: 14px;
        flex-direction: row;
        justify-content: space-between;
        gap: 14px;
        flex-wrap: wrap;
        border-top: 2px solid var(--ink);
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

      .pagination-container.cult-beats .pagination-info {
        font-family: 'DM Mono', ui-monospace, monospace;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: #6b635a;
      }

      .pagination-container.studio .pagination-info,
      .pagination-container.studio .pagination-perpage {
        font-family: 'DM Mono', ui-monospace, monospace;
        font-size: 10.5px;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        color: var(--ink-mute);
        opacity: 1;
      }

      .pagination-container.studio .pagination-info strong {
        color: var(--ink);
        font-weight: 600;
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .pagination-container.cult-beats .pagination-controls {
        gap: 0.5rem;
      }

      .pagination-container.studio .pagination-controls {
        gap: 4px;
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

      .pagination-container.cult-beats .pager-btn,
      .pagination-container.cult-beats .page-btn {
        height: 40px;
        min-width: 40px;
        border-radius: 999px;
        border: 1.5px solid #141310;
        background: #f5f1e8;
        color: #141310;
        opacity: 1;
        font-family: 'Bricolage Grotesque', sans-serif;
        font-weight: 600;
        box-shadow: 3px 3px 0 #141310;
      }

      .pagination-container.cult-beats .pager-btn:hover:not(:disabled),
      .pagination-container.cult-beats .page-btn:hover:not(:disabled) {
        background: #ece5d3;
        color: #141310;
        border-color: #141310;
      }

      .pagination-container.cult-beats .page-btn.active {
        background: #141310;
        border-color: #141310;
        color: #f5f1e8;
        box-shadow: 3px 3px 0 #ff3d5a;
      }

      .pagination-container.studio .pager-btn,
      .pagination-container.studio .page-btn {
        min-width: 34px;
        height: 34px;
        padding: 0 10px;
        background: var(--cream);
        border: 1.5px solid var(--ink);
        border-radius: 100px;
        color: var(--ink);
        opacity: 1;
        font-family: 'Bricolage Grotesque', sans-serif;
        font-weight: 700;
        font-size: 13px;
        letter-spacing: -0.01em;
        gap: 4px;
      }

      .pagination-container.studio .pager-btn::after,
      .pagination-container.studio .page-btn::after {
        display: none;
      }

      .pagination-container.studio .pager-btn:hover:not(:disabled):not(.active),
      .pagination-container.studio .page-btn:hover:not(:disabled):not(.active) {
        background: var(--cream-2);
        transform: translate(-1px, -1px);
        box-shadow: 2px 2px 0 var(--ink);
        border-color: var(--ink);
      }

      .pagination-container.studio .page-btn.active {
        background: var(--ink);
        border-color: var(--ink);
        color: var(--cream);
        box-shadow: 2px 2px 0 var(--hot);
      }

      .pagination-container.studio .pager-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .pages {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .pagination-container.studio .pages {
        gap: 4px;
      }

      .ellipsis {
        color: var(--text-color);
        opacity: 0.4;
        padding: 0 0.25rem;
      }

      .pagination-container.cult-beats .ellipsis {
        font-family: 'DM Mono', ui-monospace, monospace;
        opacity: 0.55;
      }

      .pagination-container.studio .ellipsis {
        padding: 0 4px;
        font-family: 'DM Mono', ui-monospace, monospace;
        color: var(--ink-mute);
        letter-spacing: 0.15em;
        opacity: 1;
      }

      .pagination-perpage {
        display: flex;
        align-items: center;
        gap: 6px;

        select {
          font-family: inherit;
          font-size: inherit;
          padding: 0.25rem 0.5rem;
          border: 1px solid var(--line-color);
          border-radius: 4px;
          background: transparent;
          color: var(--text-color);
          cursor: pointer;
          outline: none;
        }
      }

      .pagination-container.studio .pagination-perpage select {
        font-family: 'DM Mono', ui-monospace, monospace;
        font-size: 11px;
        padding: 5px 22px 5px 10px;
        border: 1.5px solid var(--ink);
        border-radius: 100px;
        background: var(--cream);
        color: var(--ink);
        cursor: pointer;
        letter-spacing: 0.08em;
        outline: none;
      }

      @media (max-width: 760px) {
        .pagination-container.studio .pagination-controls {
          justify-content: center;
          flex-wrap: wrap;
        }
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
  variant = input<'default' | 'cult-beats' | 'studio'>('default');
  showPerPage = input(false);
  perPageOptions = input<number[]>([8, 16, 32, 50]);

  pageChange = output<number>();
  perPageChange = output<number>();

  totalPages = computed(() => Math.ceil(this.total() / this.perPage()));

  startItem = computed(() => {
    if (this.total() === 0) return 0;
    return (this.currentPage() - 1) * this.perPage() + 1;
  });
  
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

  onPerPageChange(event: Event) {
    const value = parseInt((event.target as HTMLSelectElement).value, 10);
    this.perPageChange.emit(value);
  }
}

