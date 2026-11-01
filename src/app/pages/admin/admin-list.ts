import { computed, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import type { AdminListQuery } from '../../core/api/admin.requests';
import type { PaginatedResponse } from '../../models';

/** Page sizes the admin UI offers. The server accepts any size up to its ceiling. */
export const ADMIN_PAGE_SIZES = [5, 10, 20, 50];
export const ADMIN_DEFAULT_PAGE_SIZE = 10;

/**
 * Paging, search and loading state for one admin list. The UI owns page, page
 * size and search text; this class only forwards them to the API and keeps the
 * latest response. A newer request always cancels an older one, so a slow
 * response can never overwrite a fresher page.
 */
export class AdminList<T> {
  readonly items = signal<T[]>([]);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly perPage = signal(ADMIN_DEFAULT_PAGE_SIZE);
  /** What the user has typed, applied after a debounce. */
  readonly draft = signal('');
  /** The search currently applied to the results. */
  readonly search = signal('');
  readonly loading = signal(false);
  readonly failed = signal(false);
  readonly loaded = signal(false);

  readonly totalPages = computed(() => Math.max(1, Math.ceil(this.total() / this.perPage())));
  readonly isEmpty = computed(
    () => this.loaded() && !this.loading() && !this.failed() && this.items().length === 0,
  );

  private request?: Subscription;

  constructor(
    private readonly fetch: (query: AdminListQuery) => Observable<PaginatedResponse<T>>,
    perPage = ADMIN_DEFAULT_PAGE_SIZE,
  ) {
    this.perPage.set(perPage);
  }

  load(): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.failed.set(false);

    this.request = this.fetch({
      page: this.page(),
      limit: this.perPage(),
      q: this.search(),
    }).subscribe({
      next: (res) => {
        const total = res.metadata?.total ?? 0;
        this.total.set(total);

        // The current page no longer exists (rows were removed, or the filter
        // narrowed): step back to the last page that does.
        const lastPage = Math.max(1, Math.ceil(total / this.perPage()));
        if (this.page() > lastPage) {
          this.page.set(lastPage);
          this.load();
          return;
        }

        this.items.set(res.data ?? []);
        this.loaded.set(true);
        this.loading.set(false);
      },
      error: () => {
        this.failed.set(true);
        this.loaded.set(true);
        this.loading.set(false);
      },
    });
  }

  goTo(page: number): void {
    if (page < 1 || page === this.page()) return;
    this.page.set(page);
    this.load();
  }

  setPerPage(perPage: number): void {
    if (perPage < 1 || perPage === this.perPage()) return;
    this.perPage.set(perPage);
    this.page.set(1);
    this.load();
  }

  setSearch(text: string): void {
    const next = text.trim();
    if (next === this.search()) return;
    this.search.set(next);
    this.page.set(1);
    this.load();
  }

  /** Optimistic edits to the rows currently shown. */
  patchItems(update: (items: T[]) => T[]): void {
    this.items.update(update);
  }

  destroy(): void {
    this.request?.unsubscribe();
  }
}
